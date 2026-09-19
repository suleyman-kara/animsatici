class Monitor {
  final String id;
  final String title;
  final String url;
  final String userEmail;
  final String? userId;
  final String? lastSummary;
  final String? lastCheckedAt;
  final bool isActive;

  Monitor({
    required this.id,
    required this.title,
    required this.url,
    required this.userEmail,
    this.userId,
    this.lastSummary,
    this.lastCheckedAt,
    this.isActive = true,
  });

  factory Monitor.fromJson(Map<String, dynamic> json) {
    return Monitor(
      id: json['id'] ?? '',
      title: json['title'] ?? 'Takip Edilen Sayfa',
      url: json['url'] ?? '',
      userEmail: json['userEmail'] ?? '',
      userId: json['userId'],
      lastSummary: json['lastSummary'],
      lastCheckedAt: json['lastCheckedAt'],
      isActive: json['isActive'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'url': url,
      'userEmail': userEmail,
      'userId': userId,
      'lastSummary': lastSummary,
      'lastCheckedAt': lastCheckedAt,
      'isActive': isActive,
    };
  }
}
