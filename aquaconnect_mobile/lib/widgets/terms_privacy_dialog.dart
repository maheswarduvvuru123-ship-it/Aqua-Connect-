import 'package:flutter/material.dart';
import '../utils/theme.dart';

class TermsPrivacyDialog extends StatefulWidget {
  final String initialTab; // 'terms' | 'privacy'

  const TermsPrivacyDialog({
    super.key,
    this.initialTab = 'terms',
  });

  @override
  State<TermsPrivacyDialog> createState() => _TermsPrivacyDialogState();
}

class _TermsPrivacyDialogState extends State<TermsPrivacyDialog> {
  late String _activeTab;

  @override
  void initState() {
    super.initState();
    _activeTab = widget.initialTab;
  }

  @override
  Widget build(BuildContext context) {
    final isTerms = _activeTab == 'terms';

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 600, maxHeight: 680),
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: const BoxDecoration(
                color: Color(0xFFF8FAFC),
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0284C7), Color(0xFF06B6D4)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.water_drop, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Aqua connect Platform Policies',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Terms, IS 14543 standards & data privacy',
                          style: TextStyle(
                            fontSize: 11,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Color(0xFF64748B), size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            // Tab Selector
            Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _activeTab = 'terms'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          border: Border(
                            bottom: BorderSide(
                              color: isTerms ? AquaTheme.primary : Colors.transparent,
                              width: 3,
                            ),
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.description_outlined,
                              size: 16,
                              color: isTerms ? AquaTheme.primary : const Color(0xFF64748B),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Terms & Conditions',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: isTerms ? AquaTheme.primary : const Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _activeTab = 'privacy'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          border: Border(
                            bottom: BorderSide(
                              color: !isTerms ? AquaTheme.primary : Colors.transparent,
                              width: 3,
                            ),
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.shield_outlined,
                              size: 16,
                              color: !isTerms ? AquaTheme.primary : const Color(0xFF64748B),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Privacy Policy',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: !isTerms ? AquaTheme.primary : const Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(18),
                child: isTerms ? _buildTermsContent() : _buildPrivacyContent(),
              ),
            ),

            // Footer
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: const BoxDecoration(
                color: Color(0xFFF8FAFC),
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
                border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 16),
                  const SizedBox(width: 6),
                  const Expanded(
                    child: Text(
                      'Verified Aqua connect Standards',
                      style: TextStyle(
                        fontSize: 11,
                        color: Color(0xFF10B981),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AquaTheme.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: () => Navigator.pop(context),
                    child: const Text(
                      'I Understand & Agree',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTermsContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: const Color(0xFFF0F9FF),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFFBAE6FD)),
          ),
          child: const Text(
            'Last Updated: October 2026 • Valid for all registered customers, suppliers, and water dispatch operations.',
            style: TextStyle(fontSize: 11, color: Color(0xFF0369A1), fontWeight: FontWeight.w600),
          ),
        ),
        const SizedBox(height: 14),
        _sectionTitle('1. Service Scope & Platform Architecture'),
        _sectionText(
          'Aqua connect operates as a specialized point-of-sale (POS) and logistics dispatch software connecting certified water plant operators ("Suppliers") with commercial and residential consumers ("Customers"). Aqua connect provides inventory management, order dispatching, and direct payment tracking.',
        ),
        const SizedBox(height: 12),
        _sectionTitle('2. Returnable 20L Water Cans & Deposit Policy'),
        _sectionText(
          'All 20-Litre polycarbonate jars and dispenser containers provided by suppliers remain the physical property of the respective water plant. Customers agree to:\n'
          '• Exchange equal numbers of empty cans upon delivery of fresh cans.\n'
          '• Maintain reasonable hygiene and protect jars against puncture, chemical contamination, or unauthorized reuse.\n'
          '• Pay the standard container deposit (₹150 per can) if empty cans are not returned upon service termination.',
        ),
        const SizedBox(height: 12),
        _sectionTitle('3. Direct Payment Settlement & Disclaimers'),
        _sectionText(
          'Per Aqua connect platform rules, customer payments for drinking water are made directly to the assigned water supplier via Cash-on-Delivery (COD) or direct UPI transfer (using the supplier\'s verified UPI QR code / VPA). Aqua connect does not operate a third-party escrow or wallet; payment verification and ledger settlements are reconciled directly between the customer and the supplier plant.',
        ),
        const SizedBox(height: 12),
        _sectionTitle('4. Quality & Purification Standards'),
        _sectionText(
          'Water suppliers registered on Aqua connect certify that all drinking water supplied complies with Indian Standards for Packaged Drinking Water (IS 14543) and underwent Reverse Osmosis (RO), Ultra-Violet (UV), and Ozonation treatments.',
        ),
        const SizedBox(height: 12),
        _sectionTitle('5. Right of Account Deletion & Termination'),
        _sectionText(
          'Both customers and suppliers reserve the unconditional right to permanently delete their account and associated profile data at any time via Profile Settings. Upon deletion, all personal data is eradicated from live collections.',
        ),
      ],
    );
  }

  Widget _buildPrivacyContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: const Color(0xFFECFDF5),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFFA7F3D0)),
          ),
          child: const Text(
            '🔒 Privacy First • Your phone numbers, delivery coordinates, and purchase records are never sold or rented.',
            style: TextStyle(fontSize: 11, color: Color(0xFF065F46), fontWeight: FontWeight.w600),
          ),
        ),
        const SizedBox(height: 14),
        _sectionTitle('1. Information We Collect'),
        _sectionText(
          'To facilitate on-time water deliveries, Aqua connect collects only the minimal required information:\n'
          '• Identity & Contact: Name, phone number, and optional email address.\n'
          '• Delivery Location: Address, flat/building number, and geolocation coordinates for delivery truck dispatch.\n'
          '• Order History: Quantities ordered, can return balances, and transaction timestamps.',
        ),
        const SizedBox(height: 12),
        _sectionTitle('2. How We Use Your Data'),
        _sectionText(
          'Your data is exclusively utilized to:\n'
          '• Route delivery vehicles to your exact doorstep.\n'
          '• Send automated delivery confirmations and real-time out-for-delivery notifications.\n'
          '• Maintain accurate empty can deposit and return ledger records.',
        ),
        const SizedBox(height: 12),
        _sectionTitle('3. Data Security & Cloud Storage'),
        _sectionText(
          'All account records and transaction ledgers are encrypted in transit using SSL/TLS encryption and stored in secure Google Cloud infrastructure. Telemetry and crash metrics are kept strictly diagnostic.',
        ),
        const SizedBox(height: 12),
        _sectionTitle('4. Permanent Data Deletion (Right to Be Forgotten)'),
        _sectionText(
          'You maintain complete ownership of your personal data. You may permanently delete your profile, delivery addresses, and account credentials directly from your Profile page at any time. Upon deletion, all records are permanently eradicated from our live databases.',
        ),
      ],
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w800,
          color: Color(0xFF0F172A),
        ),
      ),
    );
  }

  Widget _sectionText(String text) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 12,
        height: 1.5,
        color: Color(0xFF334155),
      ),
    );
  }
}

Future<void> showTermsPrivacyDialog(BuildContext context, {String initialTab = 'terms'}) {
  return showDialog(
    context: context,
    builder: (ctx) => TermsPrivacyDialog(initialTab: initialTab),
  );
}

