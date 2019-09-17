package io.github.aaronlindsey.gigem.controllers;

import static io.github.aaronlindsey.gigem.utilities.Utilities.toStream;
import static java.util.stream.Collectors.toList;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import io.github.aaronlindsey.gigem.entities.Game;
import io.github.aaronlindsey.gigem.entities.Player;
import io.github.aaronlindsey.gigem.exceptions.EntityNotFoundException;
import io.github.aaronlindsey.gigem.repositories.GameRepository;
import io.github.aaronlindsey.gigem.repositories.PlayerRepository;
import io.github.aaronlindsey.gigem.services.PlayerGamePredictionsService;
import io.github.aaronlindsey.gigem.viewcomponents.GameDetailsRow;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.servlet.ModelAndView;

@Controller
public class GameDetailsController {

  private final GameRepository gameRepository;
  private final PlayerRepository playerRepository;
  private final PlayerGamePredictionsService playerGamePredictionsService;

  public GameDetailsController(GameRepository gameRepository,
                               PlayerRepository playerRepository,
                               PlayerGamePredictionsService playerGamePredictionsService) {
    this.gameRepository = gameRepository;
    this.playerRepository = playerRepository;
    this.playerGamePredictionsService = playerGamePredictionsService;
  }

  @GetMapping("/gamedetails/{id}")
  public ModelAndView getGameDetailsView(@PathVariable UUID id) {
    Game game = gameRepository.findById(id).orElseThrow(EntityNotFoundException::new);

    return playerGamePredictionsService.getPredictionsByPlayerForGame(id)
        .map(predictionsByPlayer -> gameDetailsView(game, predictionsByPlayer))
        .orElseGet(() -> gameDetailsView(game));
  }

  private ModelAndView gameDetailsView(Game game) {
    ModelAndView mav = new ModelAndView("gamedetails");
    mav.addObject("teamName", game.getTeam());
    return mav;
  }

  private ModelAndView gameDetailsView(Game game, Map<UUID, Integer> predictionsByPlayer) {
    int maxScore = getMaxScoreForGame(game, predictionsByPlayer);

    List<GameDetailsRow> gameDetailsRows = toStream(playerRepository.findAll())
        .map(p -> toGameDetailsRow(predictionsByPlayer, maxScore, p))
        .collect(toList());

    ModelAndView mav = gameDetailsView(game);
    mav.addObject("maxScore", maxScore);
    mav.addObject("gameDetailsRows", gameDetailsRows);
    if (game.getScore() != null) {
      mav.addObject("actualScore",
          new GameDetailsRow("Actual Score", game.getScore(), maxScore));
    }
    return mav;
  }

  private static int getMaxScoreForGame(Game game, Map<UUID, Integer> predictionsByPlayer) {
    int maxScorePrediction = predictionsByPlayer.values().stream()
        .max(Integer::compare)
        .orElse(0);

    if (game.getScore() == null) {
      return maxScorePrediction;
    }

    return maxScorePrediction > game.getScore()
        ? maxScorePrediction
        : game.getScore();
  }

  private static GameDetailsRow toGameDetailsRow(Map<UUID, Integer> predictionsByPlayer,int maxScore, Player p) {
    return new GameDetailsRow(p.getName(), predictionsByPlayer.getOrDefault(p.getId(), 0), maxScore);
  }

}
