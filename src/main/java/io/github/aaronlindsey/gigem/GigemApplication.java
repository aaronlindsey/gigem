package io.github.aaronlindsey.gigem;

import static org.apache.geode.cache.RegionShortcut.REPLICATE_PERSISTENT;
import static org.apache.geode.cache.client.ClientRegionShortcut.PROXY;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.gemfire.config.annotation.EnableCachingDefinedRegions;
import org.springframework.data.gemfire.config.annotation.EnableClusterConfiguration;
import org.springframework.data.gemfire.config.annotation.EnableEntityDefinedRegions;

@SpringBootApplication
@EnableEntityDefinedRegions(clientRegionShortcut = PROXY)
@EnableCachingDefinedRegions(clientRegionShortcut = PROXY)
@EnableClusterConfiguration(useHttp = true, serverRegionShortcut = REPLICATE_PERSISTENT)
public class GigemApplication {

  public static void main(String[] args) {
    SpringApplication.run(GigemApplication.class, args);
  }
}
