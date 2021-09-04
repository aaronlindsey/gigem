package io.github.aaronlindsey.gigem.services;

import io.github.aaronlindsey.gigem.entities.Game;
import io.github.aaronlindsey.gigem.entities.Prediction;
import io.github.aaronlindsey.gigem.exceptions.EntityNotFoundException;
import io.github.aaronlindsey.gigem.repositories.GameRepository;
import io.github.aaronlindsey.gigem.repositories.PredictionRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static java.time.Instant.now;
import static java.util.Comparator.comparing;
import static java.util.stream.Collectors.*;

@Service
public class PlayerGamePredictionsService {
  private final GameRepository gameRepository;
  private final PredictionRepository predictionRepository;

  public PlayerGamePredictionsService(GameRepository gameRepository,
                                      PredictionRepository predictionRepository) {
    this.gameRepository = gameRepository;
    this.predictionRepository = predictionRepository;
  }

  /**
   * Gets a map of player IDs to score predictions for the given game. If the game hasn't started,
   * returns an empty {@code Optional}
   *
   * @param gameId the ID of the game
   * @return Map of player IDs to score predictions, or empty if the game hasn't started
   * @throws EntityNotFoundException if game is not found
   */
  @Cacheable("CachedPredictionsByPlayerForGame")
  public Optional<Map<UUID, Integer>> getPredictionsByPlayerForGame(UUID gameId) {
    Game game = gameRepository.findById(gameId).orElseThrow(EntityNotFoundException::new);

    if (now().isBefore(game.getStartTime())) {
      return Optional.empty();
    }

    Optional<Instant> previousGameStartTime = gameRepository
        .findAllGamesStartedBefore(game.getStartTime())
        .stream()
        .map(Game::getStartTime)
        .max(Instant::compareTo);

    Collection<Prediction> predictionsForGame = previousGameStartTime.isPresent()
        ? predictionRepository.findAllBySubmittedTimeInRange(previousGameStartTime.get(), game.getStartTime())
        : predictionRepository.findAllBySubmittedTimeLessThan(game.getStartTime());

    Map<UUID, Optional<Prediction>> latestPredictionsByPlayer = predictionsForGame.stream()
        .collect(groupingBy(Prediction::getPlayerId, maxBy(comparing(Prediction::getSubmittedTime))));

    Map<UUID, Integer> predictionsByPlayer = latestPredictionsByPlayer.entrySet().stream()
        .filter(e -> e.getValue().isPresent())
        .collect(toMap(Map.Entry::getKey, e -> e.getValue().get().getScore()));

    return Optional.of(predictionsByPlayer);
  }
}
