package com.xekho.pos.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.xekho.pos.AppBrand
import com.xekho.pos.domain.DashboardSnapshot
import com.xekho.pos.domain.FakeDashboardRepository
import com.xekho.pos.domain.InventoryItem
import com.xekho.pos.domain.NativeTab
import com.xekho.pos.domain.TableOverview
import com.xekho.pos.ui.theme.XekhoTheme

@Composable
fun AppRoot(
    modifier: Modifier = Modifier,
    snapshot: DashboardSnapshot = remember { FakeDashboardRepository().loadSnapshot() }
) {
    var selectedTab by remember { mutableStateOf(NativeTab.TABLES) }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                snapshot.tabs.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = { Text(text = tab.label.take(1)) },
                        label = { Text(text = tab.label) }
                    )
                }
            }
        }
    ) { paddingValues ->
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            color = MaterialTheme.colorScheme.background
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
                    .padding(20.dp)
            ) {
                Header(snapshot = snapshot)
                Spacer(modifier = Modifier.height(16.dp))
                when (selectedTab) {
                    NativeTab.TABLES -> TablesScreen(snapshot.tables)
                    NativeTab.INVENTORY -> InventoryScreen(snapshot.inventory)
                    NativeTab.FINANCE -> FinanceScreen(snapshot)
                    NativeTab.SETTINGS -> SettingsScreen()
                }
            }
        }
    }
}

@Composable
private fun Header(snapshot: DashboardSnapshot) {
    Column {
        Text(
            text = AppBrand.appName,
            color = MaterialTheme.colorScheme.primary,
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "Native MVP \u00b7 fake data only \u00b7 no Firebase writes",
            color = MaterialTheme.colorScheme.onBackground,
            style = MaterialTheme.typography.bodyMedium
        )
        Spacer(modifier = Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatCard("Doanh thu", formatVnd(snapshot.finance.todayRevenue), Modifier.weight(1f))
            StatCard("\u0110\u01a1n m\u1edf", snapshot.finance.openOrders.toString(), Modifier.weight(1f))
            StatCard("Kho c\u1ea7n nh\u1eadp", snapshot.finance.lowStockCount.toString(), Modifier.weight(1f))
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.18f))
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Text(text = label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
            Text(text = value, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
        }
    }
}

@Composable
private fun TablesScreen(tables: List<TableOverview>) {
    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items(tables) { table ->
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = table.label, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(text = table.status.displayName, style = MaterialTheme.typography.bodyMedium)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(horizontalAlignment = Alignment.End) {
                        Text(text = formatVnd(table.total), color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                        Text(text = "${table.itemCount} m\u00f3n", style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
        }
    }
}

@Composable
private fun InventoryScreen(items: List<InventoryItem>) {
    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items(items) { item ->
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
                    Text(text = item.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(text = "${item.currentQty} ${item.unit} \u00b7 ${item.status.displayName}")
                }
            }
        }
    }
}

@Composable
private fun FinanceScreen(snapshot: DashboardSnapshot) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("T\u00e0i ch\u00ednh h\u00f4m nay", "Doanh thu fake: ${formatVnd(snapshot.finance.todayRevenue)}")
        SectionCard("POS dry-run", "Gi\u1ecf h\u00e0ng m\u1eabu: ${formatVnd(snapshot.draft.total)} · ch\u01b0a cho ghi production")
    }
}

@Composable
private fun SettingsScreen() {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("Tr\u1ea1ng th\u00e1i", "Sprint 2: fake UI tabs. Firebase/Auth/Firestore b\u1ecb ch\u1eb7n \u0111\u1ebfn sprint ri\u00eang.")
        SectionCard("An to\u00e0n", "Kh\u00f4ng service account, kh\u00f4ng .env, kh\u00f4ng POS production data trong APK n\u00e0y.")
    }
}

@Composable
private fun SectionCard(title: String, body: String) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(6.dp))
            Text(text = body, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

private fun formatVnd(value: Long): String = "%,d\u0111".format(value)

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
private fun AppRootPreview() {
    XekhoTheme {
        AppRoot()
    }
}
