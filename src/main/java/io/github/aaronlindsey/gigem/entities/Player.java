package io.github.aaronlindsey.gigem.entities;

import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.gemfire.mapping.annotation.Region;

@Region("Players")
public class Player implements IdEntity<UUID> {
  @Id
  private UUID id;
  private String token;
  private String name;

  public Player(UUID id, String token, String name) {
    this.id = id;
    this.token = token;
    this.name = name;
  }

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public String getToken() {
    return token;
  }

  public void setToken(String token) {
    this.token = token;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }
}
