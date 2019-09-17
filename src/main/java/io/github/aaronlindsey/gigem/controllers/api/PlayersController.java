package io.github.aaronlindsey.gigem.controllers.api;

import static java.util.Comparator.comparing;
import static org.springframework.http.HttpStatus.NO_CONTENT;

import java.util.List;
import java.util.UUID;

import io.github.aaronlindsey.gigem.entities.Player;
import io.github.aaronlindsey.gigem.repositories.PlayerRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PlayersController extends ApiControllerBase<Player> {
  public PlayersController(PlayerRepository playerRepository) {
    super(playerRepository, comparing(Player::getName));
  }

  @GetMapping("/api/players")
  public List<Player> getPlayers() {
    return getAll();
  }

  @GetMapping("/api/players/{id}")
  public Player getPlayer(@PathVariable UUID id) {
    return get(id);
  }

  @PostMapping("/api/players")
  public ResponseEntity<Void> createPlayer(@RequestBody Player player) {
    return create(player);
  }

  @DeleteMapping("/api/players/{id}")
  @ResponseStatus(NO_CONTENT)
  public void deletePlayer(@PathVariable UUID id) {
    delete(id);
  }
}
