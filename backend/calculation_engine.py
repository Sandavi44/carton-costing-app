"""
CORRUGATED CARTON COSTING ENGINE - PRODUCTION VERSION (CORRECTED)
Implements per-carton cost calculation with complete specifications
"""

from enum import Enum
from dataclasses import dataclass
from typing import List, Dict, Tuple
import math

# ============================================================================
# ENUMS - Configuration Options
# ============================================================================

class PlyType(Enum):
    """Ply types: 2-Ply, 3-Ply, 5-Ply, 7-Ply"""
    TWO_PLY = "2-Ply"
    THREE_PLY = "3-Ply"
    FIVE_PLY = "5-Ply"
    SEVEN_PLY = "7-Ply"


class BoardType(Enum):
    """Board liner types: White or Brown"""
    WHITE = "Whitecut"
    BROWN = "Bluecut"


class JoiningType(Enum):
    """Joining methods: Glued or Stitched"""
    GLUED = "Glued"
    STITCHED = "Stitched"


class FluteType(Enum):
    """Flute corrugation types"""
    E_FLUTE = 1.26
    B_FLUTE = 1.35
    C_FLUTE = 1.43


class TaxType(Enum):
    """Tax calculation methods"""
    NON_VAT_INHOUSE = "Non-VAT, Inhouse"
    NON_VAT_OUTSOURCE = "Non-VAT, Outsource"
    VAT_INHOUSE = "VAT, Inhouse"
    VAT_OUTSOURCE = "VAT, Outsource"


# ============================================================================
# CONSTANTS
# ============================================================================

REEL_WIDTHS = [
    950, 1000, 1050, 1100, 1150, 1200, 1250, 1300, 1350, 1400,
    1450, 1500, 1550, 1600, 1650, 1700, 1750, 1800, 1850
]

REEL_EDGE_LOSS_MM = 25  # 12.5mm top + 12.5mm bottom

# Sheet Length Formulas (depends on ply type)
SHEET_LENGTH_FORMULAS = {
    "2-Ply": lambda L, W: (L + W) * 2 + 62,
    "3-Ply": lambda L, W: (L + W) * 2 + 62,
    "5-Ply": lambda L, W: (L + W) * 2 + 75,
    "7-Ply": lambda L, W: (L + W) * 2 + 75,
}

# Sheet Width Adjustments (depends on ply type)
SHEET_WIDTH_ADJUSTMENTS = {
    "2-Ply": 26,
    "3-Ply": 26,
    "5-Ply": 32,
    "7-Ply": 36,
}

# Waste Allowance (inside making)
WASTE_ALLOWANCE_PERCENT = 3.0

# Tax Rates
VAT_RATE = 0.18  # 18%
SSCL_RATE = 0.02125  # 2.125%

def determine_carton_category(board_area_m2: float) -> str:
    """
    Carton Categorization based on Phase 2 Board Area:
    Type S: 0 - 0.450 m2
    Type M: 0.451 - 0.800 m2
    Type L: 0.801 m2 or above
    """
    if board_area_m2 <= 0.450:
        return "S"
    elif board_area_m2 <= 0.800:
        return "M"
    else:
        return "L"


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class CartonDimensions:
    """Carton physical dimensions in mm"""
    length_mm: float
    width_mm: float
    height_mm: float
    
    def validate(self) -> bool:
        """Validate dimensions"""
        return (self.length_mm >= 100 and self.width_mm >= 100 and 
                self.height_mm >= 50 and self.length_mm <= 2000)


@dataclass
class CostingParameters:
    """Complete costing parameters - 2-RATE VERSION"""
    # Dimensions
    carton_length_mm: float
    carton_width_mm: float
    carton_height_mm: float
    quantity: int
    
    # Material specifications
    ply_type: str  # "2-Ply", "3-Ply", "5-Ply", "7-Ply"
    board_type: str  # "Whitecut", "Bluecut"
    flute_type: str  # "B-Flute", "C-Flute", "E-Flute"
    joining_type: str  # "Glued", "Stitched"
    is_printed: bool
    
    # 2 Rates
    white_liner_rate: float
    brown_liner_rate: float
    
    # GSM values as list (variable length based on ply)
    gsm_values: List[float]  # [140, 112, 140] for 3-ply, etc.
    
    # Total overhead for entire order
    total_overhead_for_order: float
    
    # Per-carton costs
    joining_cost: float  # Rs./carton
    print_cost: float  # Rs./carton (0 if unprinted)
    slotting_cost: float = 0.0  # Rs./carton
    bundling_cost: float = 0.0  # Rs./carton
    diecutting_cost: float = 0.0  # Rs./carton
    flute_type_2: str = "B-Flute"  # "B-Flute", "C-Flute" (for 5-Ply/7-Ply)
    production_method: str = "In-house"  # "In-house", "Outsource"
    
    # Carton Type & Die Dimensions
    carton_type: str = "RSC"  # "RSC", "Lock Type", "Mail Type", "Special Shape", "S.F."
    die_length_mm: float = 0.0
    die_width_mm: float = 0.0
    
    # Waste allowances from system parameters (defaults: In-house 5%, Outsource 3%)
    inhouse_waste_percent: float = 5.0
    outsource_waste_percent: float = 3.0
    
    # Profit and tax
    profit_margin_percent: float = 15.0
    tax_type: str = "Non-VAT"
    sscl_rate: float = 2.125
    vat_rate: float = 18.0
    input_tax_rate: float = 18.0
    
    # Commissions and manual transport
    has_inhouse_commission: bool = False
    has_third_party_commission: bool = False
    third_party_commission: float = 0.0
    has_transport: bool = False
    transport_cost: float = 0.0


# ============================================================================
# CALCULATION ENGINE
# ============================================================================

class CostingCalculator:
    """Main calculation engine"""
    
    def __init__(self, params: CostingParameters):
        self.params = params
        self.results = {}
        
    def calculate(self) -> Dict:
        """Execute complete calculation"""
        # Sheet dimensions
        sheet_length = self._calculate_sheet_length()
        sheet_width = self._calculate_sheet_width()
        
        # Reel selection
        selected_reel = self._select_optimal_reel(sheet_width)
        
        # Calculate sheets per reel and waste width
        effective_width = selected_reel - REEL_EDGE_LOSS_MM
        sheets_per_reel = int(effective_width / sheet_width) if sheet_width > 0 else 0
        reel_waste_mm = selected_reel - (sheets_per_reel * sheet_width) if sheets_per_reel > 0 else 0
        
        # Board area: calculated as (sheet_length * selected_reel) / sheets_per_reel / 1,000,000 to distribute waste cost proportionally
        if sheets_per_reel > 0:
            board_area_m2 = (sheet_length * selected_reel) / sheets_per_reel / 1_000_000
        else:
            board_area_m2 = 0.0
        
        # Determine waste allowance percent based on production method
        prod_method = getattr(self.params, 'production_method', 'In-house')
        if prod_method == "Outsource" or "Outsource" in getattr(self.params, 'tax_type', ''):
            waste_allowance_percent = getattr(self.params, 'outsource_waste_percent', 3.0)
        else:
            waste_allowance_percent = getattr(self.params, 'inhouse_waste_percent', 5.0)
            
        # Weight calculations
        total_gsm = self._calculate_total_gsm()
        base_weight_kg = self._calculate_base_weight(total_gsm, board_area_m2)
        final_weight_kg = base_weight_kg * (1 + waste_allowance_percent / 100)

        # Carton categorization based on Board Area (Phase 2):
        # Type S: 0 - 0.450 m2
        # Type M: 0.451 - 0.800 m2
        # Type L: 0.801 m2 or above
        carton_category = determine_carton_category(board_area_m2)

        # Auto-proposed costs:
        # (1) Joining method:
        # Glued: S -> 3.00, M -> 4.50, L -> 6.00
        # Stitched: [(Carton Height / 25) - 1] * 2
        if self.params.joining_type == "Stitched":
            h = getattr(self.params, 'carton_height_mm', 0.0)
            proposed_joining_cost = max(0.0, round(((h / 25.0) - 1.0) * 2.0, 2)) if h > 0 else 0.0
        else:
            if carton_category == "S":
                proposed_joining_cost = 3.00
            elif carton_category == "M":
                proposed_joining_cost = 4.50
            else:
                proposed_joining_cost = 6.00

        # (2) Printing cost:
        # If is_printed: S -> 3.00, M -> 4.00, L -> 6.00; else 0.0
        if self.params.is_printed:
            if carton_category == "S":
                proposed_print_cost = 3.00
            elif carton_category == "M":
                proposed_print_cost = 4.00
            else:
                proposed_print_cost = 6.00
        else:
            proposed_print_cost = 0.00

        # (3) Slotting cost:
        # Only add slotting cost for RSC type cartons. If other type, keep as 0.0
        carton_type = getattr(self.params, 'carton_type', 'RSC')
        if carton_type == "RSC":
            if self.params.ply_type in ["2-Ply", "3-Ply"]:
                proposed_slotting_cost = 1.75
            else:
                proposed_slotting_cost = 2.50
        else:
            proposed_slotting_cost = 0.0
        
        # Rate selection based on board type only
        rate = self._get_rate()
        rm_cost_before_sscl = final_weight_kg * rate
        sscl_on_rm = rm_cost_before_sscl * (self.params.sscl_rate / 100)
        rm_cost_with_sscl = rm_cost_before_sscl + sscl_on_rm
        
        is_non_vat = "Non-VAT" in self.params.tax_type
        input_tax_on_rm = rm_cost_with_sscl * (self.params.input_tax_rate / 100) if is_non_vat else 0.0
        
        rm_cost_per_carton = rm_cost_with_sscl + input_tax_on_rm
        
        # Process costs: For outsource option, all costs disappear (overhead, joining, printing, slotting, bundling, diecutting = 0)
        if prod_method == "Outsource":
            overhead_per_carton = 0.0
            joining_cost = 0.0
            print_cost = 0.0
            slotting_cost = 0.0
            bundling_cost = 0.0
            diecutting_cost = 0.0
        else:
            overhead_per_carton = self.params.total_overhead_for_order / self.params.quantity if self.params.quantity > 0 else 0.0
            joining_cost = self.params.joining_cost if (self.params.joining_cost is not None and self.params.joining_cost > 0) else proposed_joining_cost
            print_cost = (self.params.print_cost if (self.params.print_cost is not None and self.params.print_cost > 0) else proposed_print_cost) if self.params.is_printed else 0.0
            slotting_cost = (self.params.slotting_cost if (self.params.slotting_cost is not None and self.params.slotting_cost > 0) else proposed_slotting_cost) if carton_type == 'RSC' else 0.0
            bundling_cost = self.params.bundling_cost
            diecutting_cost = self.params.diecutting_cost
            
        # Subtotal
        subtotal_per_carton = (rm_cost_per_carton + overhead_per_carton + 
                              joining_cost + print_cost + slotting_cost + bundling_cost + diecutting_cost)
        
        # Profit
        profit_per_carton = subtotal_per_carton * (self.params.profit_margin_percent / 100)
        cost_with_profit = subtotal_per_carton + profit_per_carton
        
        # Commissions (compounded sequentially)
        if self.params.has_inhouse_commission:
            inhouse_commission = (cost_with_profit * 2) / 98
        else:
            inhouse_commission = 0.0
        cost_after_inhouse = cost_with_profit + inhouse_commission
        
        if self.params.has_third_party_commission:
            third_party_commission = self.params.third_party_commission
        else:
            third_party_commission = 0.0
        cost_after_commissions = cost_after_inhouse + third_party_commission
        
        # Transport
        transport_per_carton = self._calculate_transport_cost()
        
        # Tax
        tax_per_carton, tax_breakdown = self._calculate_tax(cost_after_commissions, overhead_per_carton)
        tax_amount_per_carton = tax_per_carton
        
        # Final per-carton cost
        final_cost_per_carton = cost_after_commissions + transport_per_carton + tax_amount_per_carton
        
        # Batch cost
        total_cost_batch = final_cost_per_carton * self.params.quantity
        
        # Store results
        carton_type = getattr(self.params, 'carton_type', 'RSC')
        die_length_mm = getattr(self.params, 'die_length_mm', 0.0)
        die_width_mm = getattr(self.params, 'die_width_mm', 0.0)
        
        self.results = {
            "dimensions": {
                "carton_length_mm": self.params.carton_length_mm,
                "carton_width_mm": self.params.carton_width_mm,
                "carton_height_mm": self.params.carton_height_mm,
                "carton_type": carton_type,
                "die_length_mm": die_length_mm,
                "die_width_mm": die_width_mm,
                "carton_category": carton_category,
            },
            "category": {
                "carton_category": carton_category,
                "board_area_m2": round(board_area_m2, 4),
                "proposed_costs": {
                    "joining_cost": proposed_joining_cost,
                    "print_cost": proposed_print_cost,
                    "slotting_cost": proposed_slotting_cost,
                }
            },
            "sheet_dimensions": {
                "sheet_length_mm": round(sheet_length, 2),
                "sheet_width_mm": round(sheet_width, 2),
                "is_two_up": getattr(self, 'is_two_up', False),
                "board_area_m2": round(board_area_m2, 4),
                "selected_reel_mm": selected_reel,
                "sheets_per_reel": sheets_per_reel,
                "reel_waste_mm": round(reel_waste_mm, 2),
            },
            "material": {
                "ply_type": self.params.ply_type,
                "board_type": self.params.board_type,
                "flute_type": self.params.flute_type,
                "flute_type_2": getattr(self.params, 'flute_type_2', self.params.flute_type),
                "production_method": getattr(self.params, 'production_method', 'In-house'),
                "total_gsm": round(total_gsm, 2),
                "weight_per_sheet_kg": round(final_weight_kg, 4),
                "waste_allowance_percent": waste_allowance_percent,
            },
            "rates": {
                "rate_per_kg": round(rate, 2),
                "rm_cost_before_sscl": round(rm_cost_before_sscl, 2),
                "sscl_rate": self.params.sscl_rate,
                "sscl_on_rm": round(sscl_on_rm, 2),
                "rm_cost_with_sscl": round(rm_cost_with_sscl, 2),
                "input_tax_rate": self.params.input_tax_rate,
                "input_tax_on_rm": round(input_tax_on_rm, 2),
                "vat_rate": self.params.vat_rate,
                "rm_cost_per_carton": round(rm_cost_per_carton, 2),
            },
            "per_carton_costs": {
                "overhead": round(overhead_per_carton, 2),
                "joining": round(joining_cost, 2),
                "print": round(print_cost, 2),
                "slotting": round(slotting_cost, 2),
                "bundling": round(bundling_cost, 2),
                "diecutting": round(diecutting_cost, 2),
                "subtotal": round(subtotal_per_carton, 2),
            },
            "profit": {
                "profit_margin_percent": self.params.profit_margin_percent,
                "profit_amount": round(profit_per_carton, 2),
                "cost_with_profit": round(cost_with_profit, 2),
            },
            "commissions": {
                "has_inhouse_commission": self.params.has_inhouse_commission,
                "inhouse_commission": round(inhouse_commission, 2),
                "cost_after_inhouse": round(cost_after_inhouse, 2),
                "has_third_party_commission": self.params.has_third_party_commission,
                "third_party_commission": round(third_party_commission, 2),
                "cost_after_commissions": round(cost_after_commissions, 2),
            },
            "transport": {
                "has_transport": self.params.has_transport,
                "transport_cost": self.params.transport_cost,
                "transport_per_carton": round(transport_per_carton, 2),
            },
            "tax": {
                "tax_type": self.params.tax_type,
                "tax_amount_per_carton": round(tax_per_carton, 2),
                "tax_breakdown": tax_breakdown,
            },
            "final": {
                "final_cost_per_carton": round(final_cost_per_carton, 2),
                "quantity": self.params.quantity,
                "total_cost_batch": round(total_cost_batch, 2),
            }
        }
        
        return self.results
    
    # ========================================================================
    # INTERNAL CALCULATION METHODS
    # ========================================================================
    
    def _calculate_sheet_length(self) -> float:
        """Calculate sheet length based on ply type (or die size if not RSC)"""
        carton_type = getattr(self.params, 'carton_type', 'RSC')
        die_length = getattr(self.params, 'die_length_mm', 0.0)
        if carton_type != 'RSC' and die_length > 0:
            self.is_two_up = False
            return float(die_length)
        
        formula = SHEET_LENGTH_FORMULAS.get(self.params.ply_type, lambda L, W: (L + W) * 2 + 62)
        standard_length = formula(self.params.carton_length_mm, self.params.carton_width_mm)
        
        # For RSC type cartons, if calculated sheet length exceeds 1938 mm:
        # Produced as 2-up method -> length side allowance of 62 mm replaced with 130 mm
        if carton_type == 'RSC' and standard_length > 1938:
            self.is_two_up = True
            return (self.params.carton_length_mm + self.params.carton_width_mm) * 2 + 130
        
        self.is_two_up = False
        return standard_length
    
    def _calculate_sheet_width(self) -> float:
        """Calculate sheet width based on ply type (or die size if not RSC)"""
        carton_type = getattr(self.params, 'carton_type', 'RSC')
        die_width = getattr(self.params, 'die_width_mm', 0.0)
        if carton_type != 'RSC' and die_width > 0:
            return float(die_width)
        adjustment = SHEET_WIDTH_ADJUSTMENTS[self.params.ply_type]
        return (self.params.carton_width_mm + self.params.carton_height_mm) + adjustment
    
    def _select_optimal_reel(self, sheet_width: float) -> int:
        """Select reel that fits sheets with minimum waste"""
        best_reel = None
        best_sheets_per_reel = 0
        best_waste = float('inf')
        
        for reel_width in REEL_WIDTHS:
            effective_width = reel_width - REEL_EDGE_LOSS_MM
            sheets_per_reel = int(effective_width / sheet_width)
            
            if sheets_per_reel > 0:
                waste = effective_width - (sheets_per_reel * sheet_width)
                
                if (sheets_per_reel > best_sheets_per_reel or 
                    (sheets_per_reel == best_sheets_per_reel and waste < best_waste)):
                    best_reel = reel_width
                    best_sheets_per_reel = sheets_per_reel
                    best_waste = waste
        
        return best_reel if best_reel else REEL_WIDTHS[-1]
    
    def _calculate_board_area(self, length_mm: float, width_mm: float) -> float:
        """Calculate board area in m²"""
        return (length_mm * width_mm) / 1_000_000
    
    def _calculate_total_gsm(self) -> float:
        """Calculate total GSM with wave factors"""
        gsm = self.params.gsm_values
        
        # Flute wave factors (E-Flute: 1.26, B-Flute: 1.35, C-Flute: 1.43)
        def get_wave_factor(flute: str) -> float:
            if not flute:
                return 1.35
            f = str(flute).strip()
            if f in ["E-Flute", "E Flute", "E"]:
                return 1.26
            elif f in ["B-Flute", "B Flute", "B"]:
                return 1.35
            elif f in ["C-Flute", "C Flute", "C"]:
                return 1.43
            if "E" in f.upper():
                return 1.26
            if "C" in f.upper():
                return 1.43
            return 1.35

        wave_factor_1 = get_wave_factor(self.params.flute_type)
        flute_2 = getattr(self.params, 'flute_type_2', None) or self.params.flute_type
        wave_factor_2 = get_wave_factor(flute_2)
        
        if self.params.ply_type == "2-Ply":
            # 2-Ply: Liner 1 (Outer 1) + (Flute 1 × Factor 1)
            g0 = gsm[0] if len(gsm) > 0 else 0
            g1 = gsm[1] if len(gsm) > 1 else 0
            return g0 + (g1 * wave_factor_1)
        
        elif self.params.ply_type == "3-Ply":
            # 3-Ply: Liner 1 + (Flute 1 × Factor) + Liner 2
            return gsm[0] + (gsm[1] * wave_factor_1) + gsm[2]
        
        elif self.params.ply_type == "5-Ply":
            # 5-Ply: Liner 1 + (Flute 1 × Factor 1) + Liner 2 (Middle) + (Flute 2 × Factor 2) + Liner 3 (Outer)
            return gsm[0] + (gsm[1] * wave_factor_1) + gsm[2] + (gsm[3] * wave_factor_2) + gsm[4]
        
        else:  # 7-Ply
            # 7-Ply: O + (F1×Factor1) + M + (F2×Factor2) + M + (F3×Factor1) + O
            return (gsm[0] + (gsm[1] * wave_factor_1) + gsm[2] + 
                   (gsm[3] * wave_factor_2) + gsm[4] + (gsm[5] * wave_factor_1) + gsm[6])
    
    def _calculate_base_weight(self, total_gsm: float, board_area_m2: float) -> float:
        """Calculate base weight per sheet"""
        return (total_gsm * board_area_m2) / 1000
    
    def _get_rate(self) -> float:
        """Get rate based on board type (2-rate system)"""
        if "white" in self.params.board_type.lower():
            return self.params.white_liner_rate
        else:
            return self.params.brown_liner_rate
    
    def _calculate_transport_cost(self) -> float:
        """Calculate transport cost per carton (entered directly as per-carton cost)"""
        if not self.params.has_transport:
            return 0.0
        return float(self.params.transport_cost)
    
    def _calculate_tax(self, cost_with_profit: float, overhead: float) -> Tuple[float, Dict]:
        """Calculate tax based on tax type"""
        breakdown = {}
        vat_rate_frac = self.params.vat_rate / 100
        sscl_rate_frac = self.params.sscl_rate / 100
        
        if "Non-VAT" in self.params.tax_type or self.params.tax_type == "Non-VAT":
            # Non-VAT customers:
            # No final tax is added on at the end stage.
            # All input taxes (Input VAT + SSCL) were already capitalized into raw material cost.
            breakdown = {
                "taxable_base": 0.0,
                "tax_amount": 0.0,
                "vat_status": "Not Applicable (Non-VAT)",
                "note": "Non-VAT customer: No output tax added at final stage"
            }
            return 0.0, breakdown
        
        else:
            # VAT customer:
            # Formula: (SSCL 2.125% on cost after commissions + overhead)
            # VAT 18% is kept as INACTIVE
            taxable_base = cost_with_profit + overhead
            vat = 0.0
            sscl = taxable_base * sscl_rate_frac
            breakdown = {
                "taxable_base": round(taxable_base, 2), 
                f"vat_{self.params.vat_rate}%": 0.0,
                "vat_status": "Inactive",
                f"sscl_{self.params.sscl_rate}%": round(sscl, 2),
                "note": "VAT 18% is inactive; SSCL 2.125% applied on (Cost after Commissions + Overhead)"
            }
            return sscl, breakdown
    
    def get_results(self) -> Dict:
        """Return results"""
        return self.results


# ============================================================================
# DEMO/TEST
# ============================================================================

if __name__ == "__main__":
    params = CostingParameters(
        carton_length_mm=300,
        carton_width_mm=200,
        carton_height_mm=150,
        quantity=1000,
        ply_type="3-Ply",
        board_type="Whitecut",
        flute_type="B-Flute",
        joining_type="Glued",
        is_printed=True,
        white_liner_rate=14.0,  # CORRECTED: single rate for white
        brown_liner_rate=12.0,  # CORRECTED: single rate for brown
        gsm_values=[140, 112, 140],  # 3-Ply
        total_overhead_for_order=500,  # CORRECTED: total for order, not per carton
        joining_cost=2.00,
        print_cost=1.50,
        slotting_cost=0.0,
        bundling_cost=0.0,
        diecutting_cost=0.0,
        profit_margin_percent=15.0,
        tax_type="Non-VAT, Inhouse",
        distance_km=30,
        transport_rate_per_km=10.0
    )
    
    calculator = CostingCalculator(params)
    results = calculator.calculate()
    
    print("\n" + "="*60)
    print("CARTON COSTING CALCULATION - CORRECTED VERSION")
    print("="*60)
    print(f"Final Cost per Carton: Rs. {results['final']['final_cost_per_carton']}")
    print(f"Total Cost (Batch): Rs. {results['final']['total_cost_batch']}")
    print(f"Overhead per Carton: Rs. {results['per_carton_costs']['overhead']}")
    print(f"Rate Used: Rs. {results['rates']['rate_per_kg']}/kg")
    print("="*60)
