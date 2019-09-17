package io.github.aaronlindsey.gigem.controllers.api;

import static java.util.Comparator.comparing;
import static org.springframework.http.HttpStatus.NO_CONTENT;

import java.util.List;
import java.util.UUID;

import io.github.aaronlindsey.gigem.entities.Game;
import io.github.aaronlindsey.gigem.repositories.GameRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GamesController extends ApiControllerBase<Game> {
  public GamesController(GameRepository gameRepository) {
    super(gameRepository, comparing(Game::getStartTime));
  }

  @GetMapping("/api/games")
  public List<Game> getGames() {
    return getAll();
  }

  @GetMapping("/api/games/{id}")
  public Game getGame(@PathVariable UUID id) {
    return get(id);
  }

  @PostMapping("/api/games")
  public ResponseEntity<Void> createGame(@RequestBody Game game) {
    return create(game);
  }

  @DeleteMapping("/api/games/{id}")
  @ResponseStatus(NO_CONTENT)
  public void deleteGame(@PathVariable UUID id) {
    delete(id);
  }
}
