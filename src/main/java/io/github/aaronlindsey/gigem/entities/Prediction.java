package io.github.aaronlindsey.gigem.entities;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.gemfire.mapping.annotation.Region;

@Region("Predictions")
public class Prediction implements IdEntity<UUID> {
  @Id
  private UUID id;
  private UUID playerId;
  private Integer score;
  private Instant submittedTime;

  public Prediction(UUID id, UUID playerId, Integer score, Instant submittedTime) {
    this.id = id;
    this.playerId = playerId;
    this.score = score;
    this.submittedTime = submittedTime;
  }

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public UUID getPlayerId() {
    return playerId;
  }

  public void setPlayerId(UUID playerId) {
    this.playerId = playerId;
  }

  public Integer getScore() {
    return score;
  }

  public void setScore(Integer score) {
    this.score = score;
  }

  public Instant getSubmittedTime() {
    return submittedTime;
  }

  public void setSubmittedTime(Instant submittedTime) {
    this.submittedTime = submittedTime;
  }
}
