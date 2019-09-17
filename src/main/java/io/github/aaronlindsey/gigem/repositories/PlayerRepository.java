package io.github.aaronlindsey.gigem.repositories;

import java.util.Optional;
import java.util.UUID;

import io.github.aaronlindsey.gigem.entities.Player;
import org.springframework.data.repository.CrudRepository;

public interface PlayerRepository extends CrudRepository<Player, UUID> {
  Optional<Player> findByToken(String token);
}
