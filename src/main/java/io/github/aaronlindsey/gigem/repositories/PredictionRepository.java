package io.github.aaronlindsey.gigem.repositories;

import java.time.Instant;
import java.util.Collection;
import java.util.UUID;

import io.github.aaronlindsey.gigem.entities.Prediction;
import org.springframework.data.gemfire.repository.Query;
import org.springframework.data.repository.CrudRepository;

public interface PredictionRepository extends CrudRepository<Prediction, UUID> {
  @Query("SELECT * FROM /Predictions p WHERE p.submittedTime < $2 AND p.submittedTime >= $1")
  Collection<Prediction> findAllBySubmittedTimeInRange(Instant start, Instant end);

  @Query("SELECT * FROM /Predictions p WHERE p.submittedTime < $1")
  Collection<Prediction> findAllBySubmittedTimeLessThan(Instant end);
}
