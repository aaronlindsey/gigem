package io.github.aaronlindsey.gigem.controllers;

import static io.github.aaronlindsey.gigem.dtos.PredictionFormStatus.INVALID_PLAYER_TOKEN;
import static io.github.aaronlindsey.gigem.dtos.PredictionFormStatus.INVALID_SCORE;
import static io.github.aaronlindsey.gigem.dtos.PredictionFormStatus.SUCCESS;
import static java.time.Instant.now;
import static java.util.UUID.randomUUID;

import java.net.URI;
import java.util.Map;
import java.util.Optional;

import io.github.aaronlindsey.gigem.dtos.PredictionFormStatus;
import io.github.aaronlindsey.gigem.entities.Player;
import io.github.aaronlindsey.gigem.entities.Prediction;
import io.github.aaronlindsey.gigem.repositories.PlayerRepository;
import io.github.aaronlindsey.gigem.repositories.PredictionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@Controller
public class NewPredictionController {
  private final PlayerRepository playerRepository;
  private final PredictionRepository predictionRepository;

  public NewPredictionController(PlayerRepository playerRepository, PredictionRepository predictionRepository) {
    this.playerRepository = playerRepository;
    this.predictionRepository = predictionRepository;
  }

  @GetMapping("/newprediction")
  public ModelAndView getNewPredictionForm(@RequestParam String token,
                                           @RequestParam(required = false) PredictionFormStatus status,
                                           Map<String, Object> model) {
    model.put("token", token);
    if (status != null) {
      model.put("success", status.isSuccess());
      model.put("error", status.isSuccess() ? null : status.getDescription());
    }

    return new ModelAndView("newprediction", model);
  }

  @PostMapping("/newprediction")
  public ResponseEntity<Void> postNewPredictionForm(@RequestParam int score, @RequestParam String token) {
    if (score < 3 || score > 99) {
      return postNewPredictionResponse(token, INVALID_SCORE);
    }

    Optional<Player> player = playerRepository.findByToken(token);
    if (player.isEmpty()) {
      return postNewPredictionResponse(token, INVALID_PLAYER_TOKEN);
    }

    Prediction prediction = new Prediction(randomUUID(), player.get().getId(), score, now());
    predictionRepository.save(prediction);

    return postNewPredictionResponse(token, SUCCESS);
  }

  private ResponseEntity<Void> postNewPredictionResponse(String token, PredictionFormStatus status) {
    URI redirectUri = ServletUriComponentsBuilder.fromCurrentContextPath()
        .path("/newprediction")
        .queryParam("token", token)
        .queryParam("status", status)
        .build()
        .toUri();

    return ResponseEntity
        .status(HttpStatus.SEE_OTHER)
        .location(redirectUri)
        .build();
  }
}
