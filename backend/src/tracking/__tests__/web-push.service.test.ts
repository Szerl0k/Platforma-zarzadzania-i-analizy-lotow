import webpush from "web-push";
import {
  getVapidPublicKey,
  isWebPushConfigured,
  sendPushToUser,
} from "../web-push.service";

jest.mock("web-push", () => ({
  __esModule: true,
  default: {
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn(),
  },
}));

const mockedSend = (webpush as unknown as { sendNotification: jest.Mock })
  .sendNotification;

function makeRepo(
  subs: Array<{ endpoint: string; p256dh: string; auth: string }>,
) {
  return {
    listPushSubscriptions: jest.fn().mockResolvedValue(subs),
    deletePushSubscriptionByEndpoint: jest.fn().mockResolvedValue(undefined),
  };
}

describe("web-push.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    process.env.VAPID_SUBJECT = "mailto:a@b.c";
  });

  it("exposes the public key and configured state", () => {
    expect(getVapidPublicKey()).toBe("pub");
    expect(isWebPushConfigured()).toBe(true);
  });

  it("sends to every subscription and counts deliveries", async () => {
    mockedSend.mockResolvedValue(undefined);
    const repo = makeRepo([
      { endpoint: "e1", p256dh: "k1", auth: "a1" },
      { endpoint: "e2", p256dh: "k2", auth: "a2" },
    ]);
    const delivered = await sendPushToUser(repo as never, "u1", {
      title: "t",
      body: "b",
    });
    expect(delivered).toBe(2);
    expect(mockedSend).toHaveBeenCalledTimes(2);
  });

  it("prunes subscriptions that return 410/404", async () => {
    mockedSend.mockRejectedValue({ statusCode: 410 });
    const repo = makeRepo([{ endpoint: "dead", p256dh: "k", auth: "a" }]);
    const delivered = await sendPushToUser(repo as never, "u1", {
      title: "t",
      body: "b",
    });
    expect(delivered).toBe(0);
    expect(repo.deletePushSubscriptionByEndpoint).toHaveBeenCalledWith("dead");
  });

  it("returns 0 when no subscriptions exist", async () => {
    const repo = makeRepo([]);
    expect(
      await sendPushToUser(repo as never, "u1", { title: "t", body: "b" }),
    ).toBe(0);
    expect(mockedSend).not.toHaveBeenCalled();
  });
});
