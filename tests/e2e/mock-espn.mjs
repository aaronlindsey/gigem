import http from "node:http";

const payload = {
  events: [
    {
      id: "espn-mock-1",
      date: "2099-09-01T23:00:00Z",
      competitions: [
        {
          date: "2099-09-01T04:00:00Z",
          timeValid: false,
          competitors: [
            {
              team: { id: "245", shortDisplayName: "Texas A&M" },
              score: { value: 0, displayValue: "0" },
            },
            {
              team: { id: "999", shortDisplayName: "Mock University" },
              score: { value: 0, displayValue: "0" },
            },
          ],
          status: { type: { completed: false } },
        },
      ],
    },
    {
      id: "espn-mock-final",
      date: "2020-09-01T23:00:00Z",
      competitions: [
        {
          date: "2020-09-01T23:00:00Z",
          timeValid: true,
          competitors: [
            {
              team: { id: "245", shortDisplayName: "Texas A&M" },
              score: { value: 42, displayValue: "42" },
            },
            {
              team: { id: "998", shortDisplayName: "Final State" },
              score: { value: 17, displayValue: "17" },
            },
          ],
          status: { type: { completed: true } },
        },
      ],
    },
  ],
};

const server = http.createServer((request, response) => {
  const userAgent = request.headers["user-agent"];
  if (userAgent !== "gigem/1.0 (+https://github.com/aaronlindsey/gigem)") {
    response.writeHead(403, { "Content-Type": "text/plain" });
    response.end("Rejected User-Agent");
    return;
  }

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
});

server.listen(8790, "127.0.0.1", () => console.log("Mock ESPN listening on 8790"));
