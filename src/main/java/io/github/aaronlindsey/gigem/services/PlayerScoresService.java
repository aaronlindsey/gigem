package io.github.aaronlindsey.gigem.services;

import static io.github.aaronlindsey.gigem.utilities.Utilities.toStream;
import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.mapping;
import static java.util.stream.Collectors.summingInt;
import static java.util.stream.Collectors.toMap;

import java.util.Map;
import java.util.Map.Entry;
import java.util.Optional;
import java.util.UUID;

import io.github.aaronlindsey.gigem.entities.Game;
import io.github.aaronlindsey.gigem.entities.Player;
import io.github.aaronlindsey.gigem.repositories.GameRepository;
import io.github.aaronlindsey.gigem.repositories.PlayerRepository;
import org.springframework.stereotype.Service;

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
   * @return Map of player IDs to total scores
   */
  public Map<UUID, Integer> getScoresByPlayer() {
    Map<UUID, Integer> scoresByPlayer = toStream(gameRepository.findAll())
        .map(Game::getId)
        .map(playerGameScoresService::getScoresByPlayerForGame)
        .filter(Optional::isPresent)
        .map(Optional::get)
        .flatMap(m -> m.entrySet().stream())
        .collect(groupingBy(Entry::getKey, mapping(Entry::getValue, summingInt(Integer::intValue))));

    return toStream(playerRepository.findAll())
        .collect(toMap(Player::getId, p -> calculateScoreForPlayer(p.getId(), scoresByPlayer)));
  }

  private int calculateScoreForPlayer(UUID playerId, Map<UUID, Integer> scoresByPlayer) {
    return scoresByPlayer.getOrDefault(playerId, 0);
  }
}
