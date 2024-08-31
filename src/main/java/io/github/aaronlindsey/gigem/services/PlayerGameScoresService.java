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
import java.util.Map.Entry;
import java.util.Optional;
import java.util.UUID;

import static io.github.aaronlindsey.gigem.utilities.Utilities.toStream;
import static java.lang.Math.abs;
import static java.util.Collections.min;
import static java.util.stream.Collectors.toMap;

@Service
public class PlayerGameScoresService {
  private static final int DEFAULT_PREDICTION = 0;

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

    return Optional.of(calculateScoresByPlayer(game.getScore(), predictionsByPlayer.get()));
  }

  private Map<UUID, Integer> calculateScoresByPlayer(int gameScore, Map<UUID, Integer> predictionsByPlayer) {
    // Fill in missing predictions with the default value.
    toStream(playerRepository.findAll())
      .map(Player::getId)
      .forEach(id -> predictionsByPlayer.putIfAbsent(id, DEFAULT_PREDICTION));

    // Each players' score starts as the distance between the game score and their prediction.
    Map<UUID, Integer> denormalizedScores = predictionsByPlayer.entrySet().stream()
        .collect(toMap(Entry::getKey, e -> abs(gameScore - e.getValue())));

    // Then, the players' scores are normalized to the best score.
    int bestScore = min(denormalizedScores.values());
    Map<UUID, Integer> normalizedScores = denormalizedScores.entrySet().stream()
        .collect(toMap(Entry::getKey, e -> e.getValue() - bestScore));

    // If a player predicts the exact game score they get a bonus.
    if (bestScore == 0) {
      Map<UUID, Integer> scoresWithBonus = normalizedScores.entrySet().stream()
          .collect(toMap(Entry::getKey, e -> e.getValue() == 0 ? exactPredictionBonus : e.getValue()));
      return scoresWithBonus;
    }

    return normalizedScores;
  }
}
