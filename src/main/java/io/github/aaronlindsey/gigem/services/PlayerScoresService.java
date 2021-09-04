package io.github.aaronlindsey.gigem.services;

import io.github.aaronlindsey.gigem.entities.Game;
import io.github.aaronlindsey.gigem.entities.Player;
import io.github.aaronlindsey.gigem.repositories.GameRepository;
import io.github.aaronlindsey.gigem.repositories.PlayerRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Optional;
import java.util.UUID;

import static io.github.aaronlindsey.gigem.utilities.Utilities.toStream;
import static java.util.Collections.max;
import static java.util.stream.Collectors.*;

@Service
public class PlayerScoresService {
  private final PlayerRepository playerRepository;
  private final GameRepository gameRepository;
  private final PlayerGameScoresService playerGameScoresService;

  public PlayerScoresService(PlayerRepository playerRepository, GameRepository gameRepository,
                             PlayerGameScoresService playerGameScoresService) {
    this.playerRepository = playerRepository;
    this.gameRepository = gameRepository;
    this.playerGameScoresService = playerGameScoresService;
  }

  /**
   * Gets a map of player IDs to total scores.
   *
   * @return Map of player IDs to total scores
   */
  public Map<UUID, Integer> getScoresByPlayer() {
    Map<UUID, List<Integer>> gameScoresByPlayer = toStream(gameRepository.findAll())
        .map(Game::getId)
        .map(playerGameScoresService::getScoresByPlayerForGame)
        .filter(Optional::isPresent)
        .map(Optional::get)
        .flatMap(m -> m.entrySet().stream())
        .collect(groupingBy(Entry::getKey, mapping(Entry::getValue, toList())));

    return toStream(playerRepository.findAll())
        .collect(toMap(Player::getId, p -> calculateScoreForPlayer(p.getId(), gameScoresByPlayer)));
  }

  private int calculateScoreForPlayer(UUID playerId, Map<UUID, List<Integer>> gameScoresByPlayer) {
    if (!gameScoresByPlayer.containsKey(playerId)) {
      // If the player has no game scores yet, their overall score is zero.
      return 0;
    }

    List<Integer> playerGameScores = gameScoresByPlayer.get(playerId);

    if (playerGameScores.size() == 1) {
      // If the player only has one game score, their overall score is equal to that game score.
      return playerGameScores.get(0);
    }

    // If the player has multiple games scores, their worst score is "dropped" from their overall score.
    int playerTotalScore = playerGameScores.stream().mapToInt(Integer::intValue).sum();
    return playerTotalScore - max(playerGameScores);
  }
}
