package io.github.aaronlindsey.gigem.services;

import static io.github.aaronlindsey.gigem.utilities.Utilities.toStream;
import static java.lang.Math.abs;
import static java.util.stream.Collectors.toMap;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import io.github.aaronlindsey.gigem.entities.Game;
import io.github.aaronlindsey.gigem.entities.Player;
import io.github.aaronlindsey.gigem.exceptions.EntityNotFoundException;
import io.github.aaronlindsey.gigem.repositories.GameRepository;
import io.github.aaronlindsey.gigem.repositories.PlayerRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
public class PlayerGameScoresService {
  private final PlayerRepository playerRepository;
  private final GameRepository gameRepository;
  private final PlayerGamePredictionsService playerGamePredictionsService;

  public PlayerGameScoresService(PlayerRepository playerRepository, GameRepository gameRepository,
                                 PlayerGamePredictionsService playerGamePredictionsService) {
    this.playerRepository = playerRepository;
    this.gameRepository = gameRepository;
    this.playerGamePredictionsService = playerGamePredictionsService;
  }

  /**
   * Gets a map of player IDs to scores for the given game. Returns an empty {@code Optional} if the
   * game is not over yet or if the player predictions aren't available.
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
        .collect(toMap(id -> id, id -> calculateScore(id, game, predictionsByPlayer.get())));

    return Optional.of(scoresByPlayer);
  }

  private int calculateScore(UUID playerId, Game game, Map<UUID, Integer> predictionsByPlayer) {
    int playerPrediction = predictionsByPlayer.getOrDefault(playerId, 0);
    return abs(game.getScore() - playerPrediction);
  }
}
