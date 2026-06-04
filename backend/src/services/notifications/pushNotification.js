class PushNotification {
  async send({ userId, message, record }) {
    // External push delivery can be connected here later.
    console.log(`[PushNotification] user=${userId} alert=${record?.id ?? 'unknown'} ${message}`);

    return {
      delivered: true,
      channel: 'push',
      recordId: record?.id ?? null,
    };
  }
}

module.exports = PushNotification;
