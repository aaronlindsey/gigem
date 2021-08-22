package io.github.aaronlindsey.gigem.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.RequestDispatcher;
import javax.servlet.http.HttpServletRequest;

@Controller
public class ErrorController implements org.springframework.boot.web.servlet.error.ErrorController {
  private final static String ERROR_PATH = "/error";
  private final static String ERROR_VIEW = "error";

  @GetMapping(ERROR_PATH)
  public ModelAndView getErrorView(HttpServletRequest request) {
    Integer status = (Integer) request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
    String message = (String) request.getAttribute(RequestDispatcher.ERROR_MESSAGE);
    Throwable thrown = (Throwable) request.getAttribute(RequestDispatcher.ERROR_EXCEPTION);

    // TODO: Log the error details

    ModelAndView mav = new ModelAndView(ERROR_VIEW);
    mav.addObject("status", status);
    if (message != null && !message.isBlank()) {
      mav.addObject("message", message);
    }
    return mav;
  }

  public String getErrorPath() {
    return ERROR_PATH;
  }
}
