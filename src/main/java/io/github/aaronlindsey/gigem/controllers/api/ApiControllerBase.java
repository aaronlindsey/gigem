package io.github.aaronlindsey.gigem.controllers.api;

import static io.github.aaronlindsey.gigem.utilities.Utilities.toStream;
import static java.util.UUID.randomUUID;
import static java.util.stream.Collectors.toList;

import java.net.URI;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import io.github.aaronlindsey.gigem.entities.IdEntity;
import io.github.aaronlindsey.gigem.exceptions.EntityNotFoundException;
import org.springframework.data.repository.CrudRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

abstract class ApiControllerBase<T extends IdEntity<UUID>> {
  private final CrudRepository<T, UUID> repository;
  private final Comparator<T> comparator;

  ApiControllerBase(CrudRepository<T, UUID> repository, Comparator<T> comparator) {
    this.repository = repository;
    this.comparator = comparator;
  }

  List<T> getAll() {
    return toStream(repository.findAll())
        .sorted(comparator)
        .collect(toList());
  }

  T get(UUID id) {
    return repository.findById(id).orElseThrow(EntityNotFoundException::new);
  }

  ResponseEntity<Void> create(T entity) {
    if (entity.getId() == null) {
      entity.setId(randomUUID());
    }

    repository.save(entity);

    URI location = ServletUriComponentsBuilder
        .fromCurrentRequestUri()
        .path("/{id}")
        .buildAndExpand(entity.getId())
        .toUri();

    return ResponseEntity.created(location).build();
  }

  void delete(UUID id) {
    repository.deleteById(id);
  }
}
