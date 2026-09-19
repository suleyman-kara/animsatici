class NotificationPreferences {
  final String notificationMode; // 'instant' or 'daily_digest'
  final String preferredHour; // '18:00', '19:00', '20:00', '21:00', etc.
  final String notificationEmail;
  final bool emailEnabled;
  final bool pushEnabled;

  const NotificationPreferences({
    this.notificationMode = 'daily_digest',
    this.preferredHour = '19:00',
    required this.notificationEmail,
    this.emailEnabled = true,
    this.pushEnabled = true,
  });

  factory NotificationPreferences.fromMap(Map<String, dynamic>? data, String defaultEmail) {
    if (data == null) {
      return NotificationPreferences(notificationEmail: defaultEmail);
    }
    return NotificationPreferences(
      notificationMode: data['notificationMode'] ?? 'daily_digest',
      preferredHour: data['preferredHour'] ?? '19:00',
      notificationEmail: data['notificationEmail'] ?? defaultEmail,
      emailEnabled: data['emailEnabled'] ?? true,
      pushEnabled: data['pushEnabled'] ?? true,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'notificationMode': notificationMode,
      'preferredHour': preferredHour,
      'notificationEmail': notificationEmail,
      'emailEnabled': emailEnabled,
      'pushEnabled': pushEnabled,
      'updatedAt': DateTime.now().toIso8601String(),
    };
  }

  NotificationPreferences copyWith({
    String? notificationMode,
    String? preferredHour,
    String? notificationEmail,
    bool? emailEnabled,
    bool? pushEnabled,
  }) {
    return NotificationPreferences(
      notificationMode: notificationMode ?? this.notificationMode,
      preferredHour: preferredHour ?? this.preferredHour,
      notificationEmail: notificationEmail ?? this.notificationEmail,
      emailEnabled: emailEnabled ?? this.emailEnabled,
      pushEnabled: pushEnabled ?? this.pushEnabled,
    );
  }
}
