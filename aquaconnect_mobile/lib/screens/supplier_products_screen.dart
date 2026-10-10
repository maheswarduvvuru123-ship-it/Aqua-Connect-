import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/water_delivery_provider.dart';
import '../providers/auth_provider.dart';
import '../models/product_model.dart';
import '../utils/theme.dart';
import '../utils/responsive.dart';
import '../services/image_upload_service.dart';

class SupplierProductsScreen extends StatelessWidget {
  const SupplierProductsScreen({super.key});

  void _showAddProductDialog(BuildContext context) {
    final nameCtrl = TextEditingController();
    final priceCtrl = TextEditingController(text: '50');
    final stockCtrl = TextEditingController(text: '100');
    final unitCtrl = TextEditingController(text: '20L');
    String containerType = 'Returnable Jar';
    String? pickedImageUrl;
    bool isUploadingImage = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Add New Water Product', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          content: SingleChildScrollView(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 450),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(labelText: 'Product Name (e.g. 20L Mineral Jar)'),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: priceCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'Price (₹)'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: stockCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'Stock Units'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: unitCtrl,
                    decoration: const InputDecoration(labelText: 'Volume / Unit (e.g. 20L, 1L x 12)'),
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    isExpanded: true,
                    initialValue: containerType,
                    decoration: const InputDecoration(labelText: 'Container Type'),
                    items: const [
                      DropdownMenuItem(value: 'Returnable Jar', child: Text('Returnable Jar (20L/10L)', overflow: TextOverflow.ellipsis)),
                      DropdownMenuItem(value: 'Disposable Bottle', child: Text('Disposable Bottle', overflow: TextOverflow.ellipsis)),
                      DropdownMenuItem(value: 'Packaged Box', child: Text('Packaged Box', overflow: TextOverflow.ellipsis)),
                      DropdownMenuItem(value: 'Accessory', child: Text('Dispenser / Stand / Pump', overflow: TextOverflow.ellipsis)),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => containerType = val);
                    },
                  ),
                  const SizedBox(height: 12),
                  // Direct Gallery Album Access for Product Photo
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Product Photo (from Album / Gallery)',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AquaTheme.textSecondary),
                        ),
                        const SizedBox(height: 8),
                        if (pickedImageUrl != null)
                          Stack(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: ImageUploadService.buildImageWidget(
                                  pickedImageUrl,
                                  height: 100,
                                  width: double.infinity,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              Positioned(
                                top: 4,
                                right: 4,
                                child: InkWell(
                                  onTap: () => setState(() => pickedImageUrl = null),
                                  child: Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: const BoxDecoration(
                                      color: Colors.black54,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.close, color: Colors.white, size: 16),
                                  ),
                                ),
                              ),
                            ],
                          )
                        else
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: isUploadingImage
                                      ? null
                                      : () async {
                                          setState(() => isUploadingImage = true);
                                          final file = await ImageUploadService.pickFromGallery();
                                          if (file != null) {
                                            final url = await ImageUploadService.uploadImage(
                                              file,
                                              folder: 'products',
                                              fileIdentifier: 'prod_${DateTime.now().millisecondsSinceEpoch}',
                                            );
                                            setState(() {
                                              pickedImageUrl = url;
                                              isUploadingImage = false;
                                            });
                                          } else {
                                            setState(() => isUploadingImage = false);
                                          }
                                        },
                                  icon: isUploadingImage
                                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                                      : const Icon(Icons.photo_library, size: 16),
                                  label: Text(isUploadingImage ? 'Uploading...' : 'Choose from Gallery', style: const TextStyle(fontSize: 12)),
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AquaTheme.primary),
              onPressed: () {
                final auth = Provider.of<AuthProvider>(context, listen: false);
                final provider = Provider.of<WaterDeliveryProvider>(context, listen: false);
                final newProd = ProductModel(
                  productId: 'prod_${DateTime.now().millisecondsSinceEpoch}',
                  supplierId: auth.currentUser?.uid ?? 'supplier_main',
                  name: nameCtrl.text.trim(),
                  description: 'Purified mineral water supplied directly from plant.',
                  price: double.tryParse(priceCtrl.text) ?? 50.0,
                  image: pickedImageUrl ?? 'https://5.imimg.com/data5/AP/MU/MY-4515526/20-litre-can-jug-jar-dispenser-500x500.jpg',
                  stock: int.tryParse(stockCtrl.text) ?? 50,
                  unit: unitCtrl.text.trim(),
                  containerType: containerType,
                );
                provider.addProduct(newProd);
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Added ${newProd.name} to Catalog!')),
                );
              },
              child: const Text('Save Product', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDeleteProduct(BuildContext context, WaterDeliveryProvider waterData, ProductModel prod) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.delete_forever, color: Colors.red),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Delete Product',
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Text('Are you sure you want to permanently delete "${prod.name}" from your catalog?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              waterData.deleteProduct(prod.productId);
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Deleted "${prod.name}" from catalog')),
              );
            },
            child: const Text('Delete', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final waterData = Provider.of<WaterDeliveryProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text('Products & Catalog Management'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle, color: AquaTheme.primary, size: 28),
            tooltip: 'Add New Product',
            onPressed: () => _showAddProductDialog(context),
          ),
        ],
      ),
      body: ResponsiveLayout(
        maxWidth: 820,
        child: waterData.products.isEmpty
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey[400]),
                    const SizedBox(height: 16),
                    const Text('Catalog is empty', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    const Text('Tap "Add Product" to add 20L jars, bottles, or dispensers.', style: TextStyle(color: AquaTheme.textSecondary)),
                  ],
                ),
              )
            : ListView.builder(
          padding: const EdgeInsets.all(16.0),
          itemCount: waterData.products.length,
          itemBuilder: (context, index) {
            final prod = waterData.products[index];
            final isLowStock = prod.stock < 20;

            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: ImageUploadService.buildImageWidget(
                            prod.image,
                            width: 50,
                            height: 50,
                            fit: BoxFit.cover,
                            placeholder: Container(
                              width: 50,
                              height: 50,
                              decoration: BoxDecoration(
                                color: AquaTheme.primaryLight,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.water_drop, color: AquaTheme.primary, size: 28),
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(prod.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              Text('${prod.unit} • ${prod.containerType}', style: const TextStyle(color: AquaTheme.textSecondary, fontSize: 12)),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '₹${prod.price.toStringAsFixed(0)}',
                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AquaTheme.primary),
                            ),
                            const SizedBox(height: 4),
                            InkWell(
                              onTap: () => _confirmDeleteProduct(context, waterData, prod),
                              borderRadius: BorderRadius.circular(6),
                              child: const Padding(
                                padding: EdgeInsets.all(4.0),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.delete_outline, color: Colors.red, size: 16),
                                    SizedBox(width: 2),
                                    Text('Delete', style: TextStyle(color: Colors.red, fontSize: 11, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const Divider(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              const Text('Stock Level: ', style: TextStyle(color: AquaTheme.textSecondary, fontSize: 13)),
                              Flexible(
                                child: Text(
                                  '${prod.stock} units',
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    color: isLowStock ? Colors.red : Colors.green[800],
                                  ),
                                ),
                              ),
                              if (isLowStock)
                                Container(
                                  margin: const EdgeInsets.only(left: 6),
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(color: Colors.red[50], borderRadius: BorderRadius.circular(4)),
                                  child: const Text('Low', style: TextStyle(color: Colors.red, fontSize: 10, fontWeight: FontWeight.bold)),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(0, 32),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          icon: const Icon(Icons.add, size: 14),
                          label: const Text('+25 Stock', style: TextStyle(fontSize: 12)),
                          onPressed: () {
                            waterData.updateProductStock(prod.productId, prod.stock + 25);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Added 25 stock to ${prod.name}')),
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AquaTheme.primary,
        onPressed: () => _showAddProductDialog(context),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Add Product', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }
}
