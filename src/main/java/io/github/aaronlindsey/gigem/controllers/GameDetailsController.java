package io.github.aaronlindsey.gigem.controllers;

import io.github.aaronlindsey.gigem.entities.Game;
import io.github.aaronlindsey.gigem.entities.Player;
import io.github.aaronlindsey.gigem.exceptions.EntityNotFoundException;
import io.github.aaronlindsey.gigem.repositories.GameRepository;
import io.github.aaronlindsey.gigem.repositories.PlayerRepository;
import io.github.aaronlindsey.gigem.services.PlayerGamePredictionsService;
import io.github.aaronlindsey.gigem.viewcomponents.BonusLabel;
import io.github.aaronlindsey.gigem.viewcomponents.GameDetailsRow;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.servlet.ModelAndView;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.github.aaronlindsey.gigem.utilities.Utilities.toStream;
import static java.lang.Math.abs;
import static java.util.Comparator.comparing;
import static java.util.stream.Collectors.toList;

@Controller
public class GameDetailsController {

  private final GameRepository gameRepository;
  private final PlayerRepository playerRepository;
  private final PlayerGamePredictionsService playerGamePredictionsService;

  @Value("${exactPredictionBonus}")
  private Integer exactPredictionBonus;

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
        .map(p -> toGameDetailsRow(game, p, predictionsByPlayer, maxScore))
        .collect(toList());

    ModelAndView mav = gameDetailsView(game);
    mav.addObject("maxScore", maxScore);
    mav.addObject("gameDetailsRows", gameDetailsRows);

    if (game.getScore() != null) {
      mav.addObject("actualScore", new GameDetailsRow("Actual Score", game.getScore(), maxScore));
      gameDetailsRows.sort(comparing(r -> abs(game.getScore() - r.getScore())));
    }

    return mav;
  }

  private GameDetailsRow toGameDetailsRow(Game g, Player p, Map<UUID, Integer> predictionsByPlayer, int maxScore) {
    if (!predictionsByPlayer.containsKey(p.getId())) {
      return new GameDetailsRow(p.getName(), 0, maxScore);
    }

    int score = predictionsByPlayer.get(p.getId());

    if (g.getScore() == null) {
      return new GameDetailsRow(p.getName(), score, maxScore);
    }

    BonusLabel bonus = null;
    if (g.getScore().equals(score)) {
      bonus = new BonusLabel(exactPredictionBonus);
    }

    return new GameDetailsRow(p.getName(), score, maxScore, bonus);
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
}
