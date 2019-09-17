package io.github.aaronlindsey.gigem.dtos;

public enum PredictionFormStatus {
  SUCCESS("Success"),
  INVALID_SCORE("Invalid score"),
  INVALID_PLAYER_TOKEN("Invalid player token");

  private final String description;

  PredictionFormStatus(String description) {
    this.description = description;
  }

  public boolean isSuccess() {
    return this.equals(SUCCESS);
  }

  public String getDescription() {
    return description;
  }
}
