package io.github.aaronlindsey.gigem.controlleradvice;

import static org.springframework.http.HttpStatus.NOT_FOUND;

import java.io.IOException;

import javax.servlet.http.HttpServletResponse;

import io.github.aaronlindsey.gigem.exceptions.EntityNotFoundException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;

@ControllerAdvice
public class GlobalControllerExceptionHandler {
  @ResponseStatus(NOT_FOUND)
  @ExceptionHandler(EntityNotFoundException.class)
  public void handleEntityNotFoundException(HttpServletResponse response) throws IOException {
    response.sendError(NOT_FOUND.value(), "Entity not found");
  }
}
