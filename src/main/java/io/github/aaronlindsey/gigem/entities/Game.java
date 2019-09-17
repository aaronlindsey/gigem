package io.github.aaronlindsey.gigem.entities;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.gemfire.mapping.annotation.Region;

@Region("Games")
public class Game implements IdEntity<UUID> {
  @Id
  private UUID id;
  private String team;
  private Instant startTime;
  private Integer score;

  public Game(UUID id, String team, Instant startTime, Integer score) {
    this.id = id;
    this.team = team;
    this.startTime = startTime;
    this.score = score;
  }

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public String getTeam() {
    return team;
  }

  public void setTeam(String team) {
    this.team = team;
  }

  public Instant getStartTime() {
    return startTime;
  }

  public void setStartTime(Instant startTime) {
    this.startTime = startTime;
  }

  public Integer getScore() {
    return score;
  }

  public void setScore(Integer score) {
    this.score = score;
  }
}
