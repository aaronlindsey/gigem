package io.github.aaronlindsey.gigem.viewcomponents;

public class GameDetailsRow {
  private final String name;
  private final int score;
  private final int percentOfMax;

  public GameDetailsRow(String name, int score, int maxScore) {
    this.name = name;
    this.score = score;
    this.percentOfMax = (int) (((double) score) / maxScore * 100);
  }
}
