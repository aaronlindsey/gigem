package io.github.aaronlindsey.gigem.controllers.api;

import static java.util.Comparator.comparing;
import static org.springframework.http.HttpStatus.NO_CONTENT;

import java.util.List;
import java.util.UUID;

import io.github.aaronlindsey.gigem.entities.Prediction;
import io.github.aaronlindsey.gigem.repositories.PredictionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PredictionsController extends ApiControllerBase<Prediction> {
  public PredictionsController(PredictionRepository predictionRepository) {
    super(predictionRepository, comparing(Prediction::getSubmittedTime));
  }

  @GetMapping("/api/predictions")
  public List<Prediction> getPredictions() {
    return getAll();
  }

  @GetMapping("/api/predictions/{id}")
  public Prediction getPrediction(@PathVariable UUID id) {
    return get(id);
  }

  @PostMapping("/api/predictions")
  public ResponseEntity<Void> createPrediction(@RequestBody Prediction prediction) {
    return create(prediction);
  }

  @DeleteMapping("/api/predictions/{id}")
  @ResponseStatus(NO_CONTENT)
  public void deletePrediction(@PathVariable UUID id) {
    delete(id);
  }
}
