package io.github.aaronlindsey.gigem.controlleradvice;

import static io.github.aaronlindsey.gigem.utilities.Utilities.toStream;
import static java.util.Comparator.comparing;
import static java.util.stream.Collectors.toList;

import java.util.Collection;

import io.github.aaronlindsey.gigem.entities.Game;
import io.github.aaronlindsey.gigem.repositories.GameRepository;
import io.github.aaronlindsey.gigem.viewcomponents.GameDetailsLink;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

@ControllerAdvice
public class GlobalModelAttributes {
  private final GameRepository gameRepository;

  public GlobalModelAttributes(GameRepository gameRepository) {
    this.gameRepository = gameRepository;
  }

  @ModelAttribute("gameDetailsLinks")
  public Collection<GameDetailsLink> gameDetailsLinks() {
    return toStream(gameRepository.findAll())
        .sorted(comparing(Game::getStartTime))
        .map(GlobalModelAttributes::gameToGameDetailsLink)
        .collect(toList());
  }

  private static GameDetailsLink gameToGameDetailsLink(Game game) {
    String path = "/gamedetails/" + game.getId();
    return new GameDetailsLink(game.getTeam(), path);
  }

}
