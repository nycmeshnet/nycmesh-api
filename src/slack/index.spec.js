import {
  requestMessage,
  panoMessage,
  installMessage,
  rescheduleMessage,
} from ".";

describe("requestMessage", () => {
  describe("if the member has roof access", () => {
    it("sends a message to the join requests channel", async () => {
      const slackClient = mockSlackClient();
      slackClient.getChannel.mockResolvedValue({
        name: process.env.SLACK_REQUEST_CHANNEL,
        id: 1,
      });

      const request = { id: 4321, roof_access: true };
      const building = {
        address: "123 4th Street",
        alt: 300,
        lat: 32.1234542,
        lng: 188.029342,
        bin: "F4SF0J32",
      };
      const visibleNodes = [
        { devices: [{ type: { name: "LBE" } }], id: 5544 },
        { devices: [{ type: { name: "OmniTik" } }], id: 312 },
      ];

      const buildingNodes = [];

      await requestMessage(
        slackClient,
        request,
        building,
        visibleNodes,
        buildingNodes
      );

      expect(slackClient.getChannel).toHaveBeenCalledWith(
        process.env.SLACK_REQUEST_CHANNEL
      );
      expect(slackClient.postMessage).toHaveBeenCalled();
      const {
        channel,
        text,
        blocks,
      } = slackClient.postMessage.mock.calls[0][0];
      expect(channel).toBe(1);
      expect(text).toBe("123 4th Street");
      const lines = blocks[0].text.text.split("\n");
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe(
        "*<https://dashboard.nycmesh.net/map/requests/4321|123 4th Street>*"
      );
      expect(lines[1]).toBe("98m · Roof access · 5544, 312");
    });
  });

  describe("if the member does not have roof access", () => {
    it("sends a message to the join requests channel", async () => {
      const slackClient = mockSlackClient();
      slackClient.getChannel.mockResolvedValue({
        name: process.env.SLACK_REQUEST_CHANNEL,
        id: 1,
      });

      const request = { roof_access: false };
      const building = { address: "123 4th Street" };

      await requestMessage(slackClient, request, building, [], []);

      expect(slackClient.postMessage).toHaveBeenCalled();
      const { blocks } = slackClient.postMessage.mock.calls[0][0];
      expect(blocks[0].text.text).toContain("No roof access");
    });
  });

  describe("if there are no visible nodes", () => {
    it("sends a message to the join requests channel", async () => {
      const slackClient = mockSlackClient();
      slackClient.getChannel.mockResolvedValue({
        name: process.env.SLACK_REQUEST_CHANNEL,
        id: 1,
      });

      const building = { address: "123 4th Street" };

      await requestMessage(slackClient, {}, building, [], []);

      expect(slackClient.postMessage).toHaveBeenCalled();
      const { blocks } = slackClient.postMessage.mock.calls[0][0];
      expect(blocks[0].text.text).toContain("No LoS");
    });
  });

  describe("if visible nodes is null", () => {
    it("sends a message to the join requests channel", async () => {
      const slackClient = mockSlackClient();
      slackClient.getChannel.mockResolvedValue({
        name: process.env.SLACK_REQUEST_CHANNEL,
        id: 1,
      });

      const building = { address: "123 4th Street" };

      await requestMessage(slackClient, {}, building, null, []);

      expect(slackClient.postMessage).toHaveBeenCalled();
      const { blocks } = slackClient.postMessage.mock.calls[0][0];
      expect(blocks[0].text.text).toContain("LoS search failed");
    });
  });

  describe("if building nodes is not empty", () => {
    it("adds node in building to the slack message", async () => {
      const slackClient = mockSlackClient();
      slackClient.getChannel.mockResolvedValue({
        name: process.env.SLACK_REQUEST_CHANNEL,
        id: 1,
      });

      const building = { address: "123 4th Street" };
      const buildingNodes = [{ id: 123 }];

      await requestMessage(slackClient, {}, building, [], buildingNodes);

      expect(slackClient.postMessage).toHaveBeenCalled();
      const { blocks } = slackClient.postMessage.mock.calls[0][0];
      expect(blocks[1].elements[0].text).toEqual("✅ Node in building!");
    });
  });

  describe("if building nodes is empty", () => {
    it("adds node in building to the slack message", async () => {
      const slackClient = mockSlackClient();
      slackClient.getChannel.mockResolvedValue({
        name: process.env.SLACK_REQUEST_CHANNEL,
        id: 1,
      });

      const building = { address: "123 4th Street" };
      const buildingNodes = [];

      await requestMessage(slackClient, {}, building, [], buildingNodes);

      expect(slackClient.postMessage).toHaveBeenCalled();
      const { blocks } = slackClient.postMessage.mock.calls[0][0];
      expect(blocks.length).toEqual(1);
    });
  });

  describe("if the channel is not found", () => {
    it("does not send a message", async () => {
      const slackClient = mockSlackClient();
      slackClient.getChannel.mockResolvedValue(null);
      const consoleLog = console.log;
      console.log = jest.fn();

      await requestMessage(slackClient, {}, { address: "" }, [], []);

      expect(slackClient.postMessage).not.toHaveBeenCalled();

      console.log = consoleLog;
    });
  });
});

describe("panoMessage", () => {
  it("sends a message to the panoramas channel", async () => {
    const slackClient = mockSlackClient();
    slackClient.getChannel.mockResolvedValue({
      name: process.env.SLACK_REQUEST_CHANNEL,
      id: 2,
    });
    const url = "https://example.com";
    const requestId = 1;

    await panoMessage(
      slackClient,
      { url, request_id: requestId },
      { id: requestId, slack_ts: "123" }
    );

    expect(slackClient.getChannel).toHaveBeenCalledWith(
      process.env.SLACK_REQUEST_CHANNEL
    );
    expect(slackClient.postMessage).toHaveBeenCalled();
    const { channel, text, blocks } = slackClient.postMessage.mock.calls[0][0];
    expect(channel).toBe(2);
    expect(text).toBe("New pano for request 1!");
    expect(blocks[0].image_url).toBe("https://example.com");
  });
});

describe("installMessage", () => {
  it("sends a message to the install channel", async () => {
    const slackClient = mockSlackClient();
    slackClient.getChannel.mockResolvedValue({
      name: process.env.SLACK_INSTALL_CHANNEL,
      id: 3,
    });
    slackClient.postMessage.mockResolvedValue({ ts: 1234 });

    const appointment = {
      id: 12345,
      building: {
        address: "567 8th Street",
        alt: 250,
        lat: 91.423,
        lng: 11.121,
        bin: "8FS3",
      },
      member: {
        name: "First Last",
        phone: "800-555-5555",
        email: "first@last.com",
      },
      request: {
        id: 123,
      },
      date: 946713600000,
      request_id: 6678,
      node_id: 6678,
      type: "install",
      notes: "Omni only",
    };

    await installMessage(slackClient, appointment);

    expect(slackClient.getChannel).toHaveBeenCalledWith(
      process.env.SLACK_INSTALL_CHANNEL
    );
    const { channel, blocks, text } = slackClient.postMessage.mock.calls[0][0];
    expect(channel).toBe(3);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text.text).toBe(
      "<https://dashboard.nycmesh.net/appointments/12345|*123 - First Last - install*>\nSaturday, Jan 1 8:00 AM\n567 8th Street"
    );
    expect(text).toBe(
      "123 - First Last - install\nSaturday, Jan 1 8:00 AM\n567 8th Street"
    );
  });
});

describe("rescheduleMessage", () => {
  it("updates the original message in the install channel", async () => {
    const slackClient = mockSlackClient();
    slackClient.getChannel.mockResolvedValue({
      name: process.env.SLACK_INSTALL_CHANNEL,
      id: 3,
    });

    const appointment = {
      id: 12345,
      building: { address: "567 8th Street" },
      member: {
        name: "First Last",
        phone: "800-555-5555",
        email: "first@last.com",
      },
      request: {
        id: 123,
      },
      date: 946713600000,
      type: "survey",
    };

    await rescheduleMessage(slackClient, appointment, 2394587345);

    expect(slackClient.getChannel).toHaveBeenCalledWith(
      process.env.SLACK_INSTALL_CHANNEL
    );
    expect(slackClient.update).toHaveBeenCalled();
    const { channel, ts, blocks, text } = slackClient.update.mock.calls[0][0];
    expect(channel).toBe(3);
    expect(ts).toBe(2394587345);
    expect(blocks).toHaveLength(1);
    expect(text).toBe(
      "123 - First Last - survey\nSaturday, Jan 1 8:00 AM\n567 8th Street"
    );
  });

  it("posts a rescheduling message in a thread on the original message", async () => {
    const slackClient = mockSlackClient();
    slackClient.getChannel.mockResolvedValue({
      name: process.env.SLACK_INSTALL_CHANNEL,
      id: 3,
    });

    const appointment = {
      id: 12345,
      building: { address: "567 8th Street" },
      member: {
        name: "First Last",
        phone: "800-555-5555",
        email: "first@last.com",
      },
      request: {
        id: 123,
      },
      date: 946713600000,
    };

    await rescheduleMessage(slackClient, appointment, 2394587345);

    expect(slackClient.postMessage).toHaveBeenCalled();
    const {
      channel,
      thread_ts,
      reply_broadcast,
      text,
    } = slackClient.postMessage.mock.calls[0][0];
    expect(channel).toBe(3);
    expect(thread_ts).toBe(2394587345);
    expect(reply_broadcast).toBe(true);
    expect(text).toBe("Rescheduled to Saturday, Jan 1 8:00 AM");
  });
});

function mockSlackClient() {
  return {
    getChannel: jest.fn(),
    postMessage: jest.fn(),
    update: jest.fn(),
  };
}
