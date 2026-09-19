class Opportunity {
  final String id;
  final String sourceTitle;
  final String sourceUrl;
  final String category;
  final String summary;
  final bool hasEvent;
  final String? eventTitle;
  final String? eventStartDate;
  final String? calendarUrl;
  final String? detectedAt;

  Opportunity({
    required this.id,
    required this.sourceTitle,
    required this.sourceUrl,
    required this.category,
    required this.summary,
    this.hasEvent = false,
    this.eventTitle,
    this.eventStartDate,
    this.calendarUrl,
    this.detectedAt,
  });

  factory Opportunity.fromMap(String id, Map<String, dynamic> data) {
    final eventDetails = data['eventDetails'] as Map<String, dynamic>?;
    return Opportunity(
      id: id,
      sourceTitle: data['sourceTitle'] ?? 'Fırsat Kaynağı',
      sourceUrl: data['sourceUrl'] ?? '',
      category: data['category'] ?? 'general',
      summary: data['summary'] ?? '',
      hasEvent: data['hasEvent'] ?? false,
      eventTitle: eventDetails?['title'] ?? data['eventTitle'],
      eventStartDate: eventDetails?['startDate'] ?? data['eventStartDate'],
      calendarUrl: data['calendarUrl'],
      detectedAt: data['detectedAt'],
    );
  }
}
