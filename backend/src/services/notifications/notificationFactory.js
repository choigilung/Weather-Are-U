const PushNotification = require('./pushNotification');

class NotificationFactory {
  create(channel = 'push') {
    const normalizedChannel = String(channel).toLowerCase();

    switch (normalizedChannel) {
      case 'push':
      case 'app':
      case 'in_app':
        return new PushNotification();
      default:
        return new PushNotification();
    }
  }
}

module.exports = new NotificationFactory();
