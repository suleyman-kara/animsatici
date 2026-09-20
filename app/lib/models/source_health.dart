class SourceHealth {
  final String id;
  final String title;
  final String url;
  final String category;
  final bool isActive;
  final String lastStatus; // 'success', 'error', 'pending'
  final int? httpStatus;
  final String? lastError;
  final String? lastSummary;
  final int? latencyMs;
  final String? lastCheckedAt;

  SourceHealth({
    required this.id,
    required this.title,
    required this.url,
    this.category = 'general',
    this.isActive = true,
    this.lastStatus = 'pending',
    this.httpStatus,
    this.lastError,
    this.lastSummary,
    this.latencyMs,
    this.lastCheckedAt,
  });

  factory SourceHealth.fromMap(String id, Map<String, dynamic> data) {
    return SourceHealth(
      id: id,
      title: data['title'] ?? 'İsimsiz Kaynak',
      url: data['url'] ?? '',
      category: data['category'] ?? 'general',
      isActive: data['isActive'] ?? true,
      lastStatus: data['lastStatus'] ?? 'pending',
      httpStatus: data['httpStatus'],
      lastError: data['lastError'],
      lastSummary: data['lastSummary'],
      latencyMs: data['latencyMs'],
      lastCheckedAt: data['lastCheckedAt'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'title': title,
      'url': url,
      'category': category,
      'isActive': isActive,
      'lastStatus': lastStatus,
      'httpStatus': httpStatus,
      'lastError': lastError,
      'lastSummary': lastSummary,
      'latencyMs': latencyMs,
      'lastCheckedAt': lastCheckedAt,
    };
  }
}
