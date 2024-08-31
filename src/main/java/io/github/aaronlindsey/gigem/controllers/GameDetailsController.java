package io.github.aaronlindsey.gigem.controllers;

import io.github.aaronlindsey.gigem.entities.Game;
import io.github.aaronlindsey.gigem.exceptions.EntityNotFoundException;
import io.github.aaronlindsey.gigem.repositories.GameRepository;
import io.github.aaronlindsey.gigem.repositories.PlayerRepository;
import io.github.aaronlindsey.gigem.services.PlayerGamePredictionsService;
import io.github.aaronlindsey.gigem.services.PlayerGameScoresService;
import io.github.aaronlindsey.gigem.viewcomponents.BonusLabel;
import io.github.aaronlindsey.gigem.viewcomponents.GameDetailsRow;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.servlet.ModelAndView;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static io.github.aaronlindsey.gigem.utilities.Utilities.toStream;
import static java.util.Comparator.comparing;
import static java.util.stream.Collectors.toList;

@Controller
public class GameDetailsController {

  private final GameRepository gameRepository;
  private final PlayerRepository playerRepository;
  private final PlayerGamePredictionsService playerGamePredictionsService;
  private final PlayerGameScoresService playerGameScoresService;

  @Value("${exactPredictionBonus}")
  private Integer exactPredictionBonus;

  public GameDetailsController(GameRepository gameRepository,
                               PlayerRepository playerRepository,
                               PlayerGamePredictionsService playerGamePredictionsService,
                               PlayerGameScoresService playerGameScoresService) {
    this.gameRepository = gameRepository;
    this.playerRepository = playerRepository;
    this.playerGamePredictionsService = playerGamePredictionsService;
    this.playerGameScoresService = playerGameScoresService;
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
    int maxPrediction = getMaxPredictionForGame(game, predictionsByPlayer);

    Optional<Map<UUID, Integer>> scoresByPlayerOpt = playerGameScoresService.getScoresByPlayerForGame(game.getId());

    List<GameDetailsRow> gameDetailsRows = toStream(playerRepository.findAll())
        .map(p -> {
          int prediction = predictionsByPlayer.putIfAbsent(p.getId(), 0);
          if (scoresByPlayerOpt.isPresent()) {
            Integer score = scoresByPlayerOpt.get().get(p.getId());
            BonusLabel bonus = prediction == game.getScore() ? new BonusLabel(exactPredictionBonus) : null;
            return new GameDetailsRow(p.getName(), prediction, maxPrediction, score, bonus);
          }
          return new GameDetailsRow(p.getName(), prediction, maxPrediction);
        })
        .collect(toList());

    ModelAndView mav = gameDetailsView(game);
    mav.addObject("maxPrediction", maxPrediction);
    mav.addObject("gameDetailsRows", gameDetailsRows);

    if (game.getScore() != null) {
      mav.addObject("actualScore", new GameDetailsRow("Actual Score", game.getScore(), maxPrediction));
      gameDetailsRows.sort(comparing(r -> r.getScore()));
    }

    return mav;
  }

  private static int getMaxPredictionForGame(Game game, Map<UUID, Integer> predictionsByPlayer) {
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
