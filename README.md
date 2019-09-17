# Gig'em

A Spring Boot and Apache Geode application for guessing the score of Texas A&M football games.

## Why I Made This

I work on the [Apache Geode](https://github.com/apache/geode) distributed database project, and I wanted to build a simple Spring Boot web application to better understand a developer's experience using Apache Geode with Spring Boot.

My family has a competition to guess the score of each Texas A&M football game — I thought it would be fun to turn this into a simple app.

Yes, using a distributed database with caching is quite unnecessary for this app. Also, there are no tests, which makes me sad. But the point was just to get in a "Spring Boot Apache Geode" developer's shoes for a little while.

## Running Locally

Prerequisites:
- Apache Geode 1.9.x
- Java 11 or higher

Start a Geode cluster:
```
gfsh -e "start locator --name=locator" -e "configure pdx --disk-store=DEFAULT" -e "start server --name=server"
```

Build and run the Spring Boot app:
```
./gradlew build
java -jar build/libs/gigem-0.0.1-SNAPSHOT.jar
```

Populate demo data:
```
chmod +x demo.sh
./demo.sh
```

## Running on Cloud Foundry and Pivotal Cloud Cache

You can also run this app by pushing it Cloud Foundry using the provided `manifest.yml` and binding it to an instance of Pivotal Cloud Cache. [Pivotal Web Services](https://run.pivotal.io/) provides a managed Cloud Foundry environment with access to Pivotal Cloud Cache and has a free trial option.

## How To Play

- Players go to `/newpredictions?token=<TOKEN>` with their identifying token to submit a prediction. A player may submit more than one prediction and only the latest one will be used.
- When a game starts, each players' latest prediction since the previous game will be displayed on the `/gamedetails/<UUID>` page. The predictions for a game are locked in after the game starts.
- When a game ends, an administrator updates the game's score. At this point, the `/` page will update to show the sum of the differences between each player's prediction and the final score for each game.
- The object of the game is to have the lowest overall score by making predictions closest to the actual scores.

## Admin API

- The admin API allows CRUD operations on any of the data in the app.
- There are three REST endpoints, `/api/games`, `/api/players`, `/api/predictions`, which support GET, POST, and DELETE requests.
- The default username/password is `admin`/`admin`.

