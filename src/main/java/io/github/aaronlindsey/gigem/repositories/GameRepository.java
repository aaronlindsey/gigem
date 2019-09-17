package io.github.aaronlindsey.gigem.repositories;

import java.time.Instant;
import java.util.Collection;
import java.util.UUID;

import io.github.aaronlindsey.gigem.entities.Game;
import org.springframework.data.gemfire.repository.Query;
import org.springframework.data.repository.CrudRepository;

public interface GameRepository extends CrudRepository<Game, UUID> {
  @Query("SELECT * FROM /Games g WHERE g.startTime < $1")
  Collection<Game> findAllGamesStartedBefore(Instant time);
}
