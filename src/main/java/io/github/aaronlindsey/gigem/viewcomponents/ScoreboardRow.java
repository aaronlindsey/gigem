package io.github.aaronlindsey.gigem.viewcomponents;

public class ScoreboardRow {
  private final String playerName;
  private final int playerScore;

  public ScoreboardRow(String playerName, int playerScore) {
    this.playerName = playerName;
    this.playerScore = playerScore;
  }

  public String getPlayerName() {
    return playerName;
  }

  public int getPlayerScore() {
    return playerScore;
  }
}
