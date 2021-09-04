package io.github.aaronlindsey.gigem.services;

import io.github.aaronlindsey.gigem.entities.Game;
import io.github.aaronlindsey.gigem.entities.Player;
import io.github.aaronlindsey.gigem.exceptions.EntityNotFoundException;
import io.github.aaronlindsey.gigem.repositories.GameRepository;
import io.github.aaronlindsey.gigem.repositories.PlayerRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static io.github.aaronlindsey.gigem.utilities.Utilities.toStream;
import static java.lang.Math.abs;
import static java.util.stream.Collectors.toMap;

@Service
public class PlayerGameScoresService {
  private final PlayerRepository playerRepository;
  private final GameRepository gameRepository;
  private final PlayerGamePredictionsService playerGamePredictionsService;

  @Value("${exactPredictionBonus}")
  private Integer exactPredictionBonus;

  public PlayerGameScoresService(PlayerRepository playerRepository, GameRepository gameRepository,
                                 PlayerGamePredictionsService playerGamePredictionsService) {
    this.playerRepository = playerRepository;
    this.gameRepository = gameRepository;
    this.playerGamePredictionsService = playerGamePredictionsService;
  }

  /**
   * Gets a map of player IDs to scores for the given game. Returns an empty {@code Optional} if the
   * game is not over yet or if the player predictions aren't available.
   *
   * @param gameId the ID of the game
   * @return Map of player IDs to scores, or empty if the game is not over or the player predictions
   * aren't available
   * @throws EntityNotFoundException if game is not found
   */
  @Cacheable("CachedScoresByPlayerForGame")
  public Optional<Map<UUID, Integer>> getScoresByPlayerForGame(UUID gameId) {
    Game game = gameRepository.findById(gameId).orElseThrow(EntityNotFoundException::new);

    if (game.getScore() == null) {
      return Optional.empty();
    }

    Optional<Map<UUID, Integer>> predictionsByPlayer =
        playerGamePredictionsService.getPredictionsByPlayerForGame(gameId);

    if (predictionsByPlayer.isEmpty()) {
      return Optional.empty();
    }

    Map<UUID, Integer> scoresByPlayer = toStream(playerRepository.findAll())
        .map(Player::getId)
        .collect(toMap(id -> id, id -> calculateScoreForPlayerAndGame(id, game, predictionsByPlayer.get())));

    return Optional.of(scoresByPlayer);
  }

  private int calculateScoreForPlayerAndGame(UUID playerId, Game game, Map<UUID, Integer> predictionsByPlayer) {
    if (!predictionsByPlayer.containsKey(playerId)) {
      // If the player did not submit a prediction, their score is equal to the game score.
      return game.getScore();
    }

    int playerPrediction = predictionsByPlayer.get(playerId);
    if (game.getScore().equals(playerPrediction)) {
      // If the player predicts the exact game score they get a bonus.
      return exactPredictionBonus;
    }

    // The player's score is the distance between the game score and their prediction.
    return abs(game.getScore() - playerPrediction);
  }
}
