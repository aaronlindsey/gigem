package io.github.aaronlindsey.gigem;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.gemfire.config.annotation.*;

import static org.apache.geode.cache.RegionShortcut.PARTITION_PERSISTENT;

@SpringBootApplication
@EnableLocator
@EnableManager
@CacheServerApplication
@EnablePdx(persistent = true)
@EnableEntityDefinedRegions(serverRegionShortcut = PARTITION_PERSISTENT)
@EnableCachingDefinedRegions()
@EnableClusterConfiguration()
public class GigemApplication {

  public static void main(String[] args) {
    SpringApplication.run(GigemApplication.class, args);
  }
}
