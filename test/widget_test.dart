import 'package:flutter_test/flutter_test.dart';

import '../lib/main.dart';

void main() {
  testWidgets(
    'MyApp dapat dibuat',
    (WidgetTester tester) async {
      await tester.pumpWidget(
        const MyApp(),
      );

      expect(
        find.byType(MyApp),
        findsOneWidget,
      );
    },
  );
}
