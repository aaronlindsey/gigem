package io.github.aaronlindsey.gigem.viewcomponents;

public class GameDetailsRow {
  private final String name;
  private final int prediction;
  private final int percentOfMax;
  private final Integer score;
  private final BonusLabel bonus;

  public GameDetailsRow(String name, int prediction, int maxPrediction) {
    this(name, prediction, maxPrediction, null, null);
  }

  public GameDetailsRow(String name, int prediction, int maxPrediction, Integer score, BonusLabel bonus) {
    this.name = name;
    this.prediction = prediction;
    this.percentOfMax = (int) (((double) prediction) / maxPrediction * 100);
    this.score = score;
    this.bonus = bonus;
  }

  public Integer getScore() {
    return score;
  }
}
