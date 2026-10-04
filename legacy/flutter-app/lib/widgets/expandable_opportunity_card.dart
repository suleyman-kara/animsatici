import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/constants.dart';
import '../models/catalog_item.dart';
import '../models/opportunity.dart';
import '../screens/company/company_detail_screen.dart';

class ExpandableOpportunityCard extends StatefulWidget {
  final Opportunity opportunity;
  final bool isAdmin;
  final bool isRecommended;
  final String userId;
  final String userEmail;
  final VoidCallback? onStatusChanged;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;

  const ExpandableOpportunityCard({
    super.key,
    required this.opportunity,
    this.isAdmin = false,
    this.isRecommended = false,
    required this.userId,
    required this.userEmail,
    this.onStatusChanged,
    this.onEdit,
    this.onDelete,
  });

  @override
  State<ExpandableOpportunityCard> createState() => _ExpandableOpportunityCardState();
}

class _ExpandableOpportunityCardState extends State<ExpandableOpportunityCard> {
  bool _isExpanded = false;

  void _navigateToCompany() {
    final opp = widget.opportunity;
    final item = CatalogItem(
      id: opp.sourceId ?? opp.sourceTitle.toLowerCase().replaceAll(' ', '-'),
      title: opp.sourceTitle,
      category: opp.category,
      description: '${opp.sourceTitle} tarafından sunulan etkinlikler ve kariyer fırsatları.',
      url: opp.sourceUrl,
      tags: [opp.category],
      icon: '🏢',
    );

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => CompanyDetailScreen(
          item: item,
          userId: widget.userId,
          userEmail: widget.userEmail,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final opp = widget.opportunity;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeInOut,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: widget.isRecommended
              ? AppConstants.primary.withValues(alpha: 0.4)
              : (opp.isUpdated
                  ? Colors.amber.shade300
                  : (opp.isPendingReview ? Colors.orange.shade200 : AppConstants.border)),
          width: widget.isRecommended || opp.isUpdated || opp.isPendingReview ? 1.5 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: _isExpanded ? 0.06 : 0.02),
            blurRadius: _isExpanded ? 16 : 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: InkWell(
        onTap: () => setState(() => _isExpanded = !_isExpanded),
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Üst Başlık & Rozetler
              Row(
                children: [
                  // Şirket Adı (Tıklanınca Şirket Detayına Gider)
                  InkWell(
                    onTap: _navigateToCompany,
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppConstants.primary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.business_rounded, size: 13, color: AppConstants.primary),
                          const SizedBox(width: 5),
                          Text(
                            opp.sourceTitle,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppConstants.primary,
                            ),
                          ),
                          const SizedBox(width: 3),
                          const Icon(Icons.arrow_forward_ios_rounded, size: 9, color: AppConstants.primary),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),

                  // İlgi Alanına Uygun Rozeti
                  if (widget.isRecommended)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.purple.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.purple.shade200),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.auto_awesome_rounded, size: 11, color: Colors.purple),
                          SizedBox(width: 4),
                          Text(
                            'Sana Özel',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.purple),
                          ),
                        ],
                      ),
                    ),

                  // Güncellendi Rozeti
                  if (opp.isUpdated) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.amber.shade300),
                      ),
                      child: const Text(
                        '🔄 Güncellendi',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.amber),
                      ),
                    ),
                  ],

                  const Spacer(),

                  // Açılır / Kapanır Ok İkonu
                  AnimatedRotation(
                    turns: _isExpanded ? 0.5 : 0.0,
                    duration: const Duration(milliseconds: 200),
                    child: const Icon(Icons.keyboard_arrow_down_rounded, color: AppConstants.textSecondary),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // 2. Etkinlik Başlığı
              Text(
                opp.eventTitle ?? opp.sourceTitle,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: AppConstants.textPrimary,
                  height: 1.3,
                ),
              ),
              const SizedBox(height: 6),

              // 3. Tarih Satırı
              if (opp.eventStartDate != null && opp.eventStartDate!.isNotEmpty)
                Row(
                  children: [
                    const Icon(Icons.event_rounded, size: 14, color: AppConstants.textSecondary),
                    const SizedBox(width: 5),
                    Text(
                      _formatDateDisplay(opp.eventStartDate!, opp.eventEndDate),
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppConstants.textSecondary,
                      ),
                    ),
                  ],
                ),

              // 4. Genişleyen Kısım (In-Place Expansion)
              AnimatedCrossFade(
                firstChild: const SizedBox.shrink(),
                secondChild: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 14),
                    const Divider(height: 1),
                    const SizedBox(height: 14),

                    // Açıklama / Yapay Zeka Özeti
                    const Text(
                      'Etkinlik Özeti & Detaylar:',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppConstants.textPrimary),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      opp.summary,
                      style: const TextStyle(fontSize: 13, color: AppConstants.textSecondary, height: 1.5),
                    ),
                    const SizedBox(height: 16),

                    // Butonlar
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        // Google Takvim'e Ekle
                        if (opp.calendarUrl != null && opp.calendarUrl!.isNotEmpty)
                          ElevatedButton.icon(
                            onPressed: () => launchUrl(Uri.parse(opp.calendarUrl!), mode: LaunchMode.externalApplication),
                            icon: const Icon(Icons.calendar_month_rounded, size: 15),
                            label: const Text('Google Takvim\'e Ekle', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppConstants.primary,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            ),
                          ),

                        // Resmi Duyuru / Başvuru Bağlantısı
                        OutlinedButton.icon(
                          onPressed: () => launchUrl(Uri.parse(opp.sourceUrl), mode: LaunchMode.externalApplication),
                          icon: const Icon(Icons.open_in_new_rounded, size: 13),
                          label: const Text('Resmi Duyuruya Git', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppConstants.textPrimary,
                            side: const BorderSide(color: AppConstants.border),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                        ),

                        // Şirket Sayfasına Git
                        TextButton.icon(
                          onPressed: _navigateToCompany,
                          icon: const Icon(Icons.business_center_outlined, size: 14),
                          label: Text('${opp.sourceTitle} Sayfası', style: const TextStyle(fontSize: 12)),
                        ),
                      ],
                    ),

                    // Yönetici Hızlı Kontrolleri
                    if (widget.isAdmin) ...[
                      const SizedBox(height: 12),
                      const Divider(height: 1),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          if (widget.onStatusChanged != null) ...[
                            TextButton.icon(
                              onPressed: widget.onStatusChanged,
                              icon: Icon(
                                opp.isApproved ? Icons.cancel_outlined : Icons.check_circle_outline,
                                size: 16,
                                color: opp.isApproved ? Colors.red : Colors.green,
                              ),
                              label: Text(
                                opp.isApproved ? 'Yayından Kaldır' : 'Onayla & Yayınla',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: opp.isApproved ? Colors.red : Colors.green,
                                ),
                              ),
                            ),
                          ],
                          if (widget.onEdit != null)
                            IconButton(
                              icon: const Icon(Icons.edit_outlined, size: 18, color: Colors.blue),
                              tooltip: 'Düzenle',
                              onPressed: widget.onEdit,
                            ),
                          if (widget.onDelete != null)
                            IconButton(
                              icon: const Icon(Icons.delete_outline, size: 18, color: Colors.grey),
                              tooltip: 'Sil',
                              onPressed: widget.onDelete,
                            ),
                        ],
                      ),
                    ],
                  ],
                ),
                crossFadeState: _isExpanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
                duration: const Duration(milliseconds: 250),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDateDisplay(String startIso, String? endIso) {
    try {
      final start = DateTime.parse(startIso).toLocal();
      final formatter = DateFormat('dd MMM yyyy HH:mm', 'tr_TR');
      String text = formatter.format(start);

      if (endIso != null && endIso.isNotEmpty) {
        final end = DateTime.parse(endIso).toLocal();
        final endFormatter = DateFormat('dd MMM yyyy HH:mm', 'tr_TR');
        text += ' – ${endFormatter.format(end)}';
      }
      return text;
    } catch (_) {
      try {
        final dt = DateTime.parse(startIso).toLocal();
        return DateFormat('dd.MM.yyyy HH:mm').format(dt);
      } catch (_) {
        return startIso;
      }
    }
  }
}
