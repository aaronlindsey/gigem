package io.github.aaronlindsey.gigem.viewcomponents;

public class GameDetailsRow {
  private final String name;
  private final int score;
  private final int percentOfMax;
  private final BonusLabel bonus;

  public GameDetailsRow(String name, int score, int maxScore) {
    this(name, score, maxScore, null);
  }

  public GameDetailsRow(String name, int score, int maxScore, BonusLabel bonus) {
    this.name = name;
    this.score = score;
    this.percentOfMax = (int) (((double) score) / maxScore * 100);
    this.bonus = bonus;
  }

  public int getScore() {
    return score;
  }
}
