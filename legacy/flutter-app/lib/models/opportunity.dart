class Opportunity {
  final String id;
  final String? sourceId;
  final String sourceTitle;
  final String sourceUrl;
  final String category;
  final String summary;
  final bool hasEvent;
  final String? eventTitle;
  final String? eventStartDate;
  final String? eventEndDate;
  final bool isAllDay;
  final String? calendarUrl;
  final String status; // 'pending_review', 'approved', 'rejected'
  final String changeType; // 'new_event', 'updated_event', 'cancelled_event', 'general_announcement'
  final String? detectedAt;
  final String? updatedAt;

  Opportunity({
    required this.id,
    this.sourceId,
    required this.sourceTitle,
    required this.sourceUrl,
    required this.category,
    required this.summary,
    this.hasEvent = false,
    this.eventTitle,
    this.eventStartDate,
    this.eventEndDate,
    this.isAllDay = false,
    this.calendarUrl,
    this.status = 'approved',
    this.changeType = 'new_event',
    this.detectedAt,
    this.updatedAt,
  });

  bool get isApproved => status == 'approved';
  bool get isPendingReview => status == 'pending_review';
  bool get isRejected => status == 'rejected';
  bool get isUpdated => changeType == 'updated_event';
  bool get isCancelled => changeType == 'cancelled_event';

  factory Opportunity.fromMap(String id, Map<String, dynamic> data) {
    final eventDetails = data['eventDetails'] as Map<String, dynamic>?;
    return Opportunity(
      id: id,
      sourceId: data['sourceId'],
      sourceTitle: data['sourceTitle'] ?? 'Fırsat Kaynağı',
      sourceUrl: data['sourceUrl'] ?? '',
      category: data['category'] ?? 'general',
      summary: data['summary'] ?? '',
      hasEvent: data['hasEvent'] ?? false,
      eventTitle: eventDetails?['title'] ?? data['eventTitle'] ?? data['sourceTitle'],
      eventStartDate: eventDetails?['startDate'] ?? data['eventStartDate'],
      eventEndDate: eventDetails?['endDate'] ?? data['eventEndDate'],
      isAllDay: eventDetails?['isAllDay'] ?? data['isAllDay'] ?? false,
      calendarUrl: data['calendarUrl'],
      status: data['status'] ?? 'approved', // Varsayılan onaylı kabul edilir
      changeType: data['changeType'] ?? 'new_event',
      detectedAt: data['detectedAt'],
      updatedAt: data['updatedAt'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      if (sourceId != null) 'sourceId': sourceId,
      'sourceTitle': sourceTitle,
      'sourceUrl': sourceUrl,
      'category': category,
      'summary': summary,
      'hasEvent': hasEvent,
      'status': status,
      'changeType': changeType,
      'eventDetails': {
        'title': eventTitle,
        'startDate': eventStartDate,
        'endDate': eventEndDate,
        'isAllDay': isAllDay,
      },
      'calendarUrl': calendarUrl,
      'detectedAt': detectedAt,
      'updatedAt': updatedAt,
    };
  }
}
