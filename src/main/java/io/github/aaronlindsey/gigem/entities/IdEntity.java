package io.github.aaronlindsey.gigem.entities;

public interface IdEntity<T> {
  void setId(T id);
  T getId();
}
