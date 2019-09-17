package io.github.aaronlindsey.gigem.utilities;

import java.util.stream.Stream;
import java.util.stream.StreamSupport;

public class Utilities {
  public static <T> Stream<T> toStream(Iterable<T> iterable) {
    return StreamSupport.stream(iterable.spliterator(), false);
  }
}
