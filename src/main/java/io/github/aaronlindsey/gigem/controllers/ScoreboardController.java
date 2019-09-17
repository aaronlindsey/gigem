package io.github.aaronlindsey.gigem.controllers;

import static io.github.aaronlindsey.gigem.utilities.Utilities.toStream;
import static java.util.Comparator.comparing;
import static java.util.stream.Collectors.toList;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import io.github.aaronlindsey.gigem.repositories.PlayerRepository;
import io.github.aaronlindsey.gigem.services.PlayerScoresService;
import io.github.aaronlindsey.gigem.viewcomponents.ScoreboardRow;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.servlet.ModelAndView;

@Controller
public class ScoreboardController {
  private final PlayerRepository playerRepository;
  private final PlayerScoresService playerScoresService;

  public ScoreboardController(PlayerRepository playerRepository, PlayerScoresService playerScoresService) {
    this.playerRepository = playerRepository;
    this.playerScoresService = playerScoresService;
  }

  @GetMapping("/")
  public ModelAndView getScoreboardView() {
    Map<UUID, Integer> scoresByPlayer = playerScoresService.getScoresByPlayer();

    List<ScoreboardRow> scoreboardRows = toStream(playerRepository.findAll())
        .map(p -> new ScoreboardRow(p.getName(), scoresByPlayer.get(p.getId())))
        .sorted(comparing(ScoreboardRow::getPlayerScore))
        .collect(toList());

    ModelAndView mav = new ModelAndView("scoreboard");
    mav.addObject("scoreboardRows", scoreboardRows);
    return mav;
  }

}
