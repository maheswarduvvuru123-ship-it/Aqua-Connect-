class CanTransactionModel {
  final String id;
  final String customerId;
  final String customerName;
  final DateTime date;
  final String type; // 'Delivered' | 'Returned' | 'Deposit Adjusted'
  final int cansDelivered;
  final int cansReturned;
  final int runningBalance;

  CanTransactionModel({
    required this.id,
    required this.customerId,
    required this.customerName,
    required this.date,
    required this.type,
    required this.cansDelivered,
    required this.cansReturned,
    required this.runningBalance,
  });
}
