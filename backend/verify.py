import urllib.request
import urllib.error
import json

def test_flow():
    print("Testing Corrugated Carton Costing System REST API (2-rate system)...")

    # 1. Login
    login_data = json.dumps({"username": "admin", "password": "admin123"}).encode('utf-8')
    req = urllib.request.Request(
        "http://localhost:5000/api/auth/login",
        data=login_data,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as res:
            login_resp = json.loads(res.read().decode('utf-8'))
            token = login_resp["access_token"]
            print("[OK] Successfully logged in as admin.")
    except urllib.error.HTTPError as e:
        print("[ERROR] Login failed. HTTP code:", e.code)
        try:
            print("Response:", e.read().decode('utf-8'))
        except:
            pass
        return
    except Exception as e:
        print("[ERROR] Login failed:", e)
        return

    # 2. Calculate Cost
    calc_payload = {
        "customer_name": "Test Customer",
        "carton_length_mm": 300,
        "carton_width_mm": 200,
        "carton_height_mm": 150,
        "quantity": 1000,
        "ply_type": "3-Ply",
        "board_type": "Whitecut",
        "flute_type": "B-Flute",
        "joining_type": "Glued",
        "is_printed": True,
        "white_liner_rate": 14.0,
        "brown_liner_rate": 12.0,
        "gsm_values": [140, 112, 140],
        "total_overhead_for_order": 500.0,
        "joining_cost": 2.00,
        "print_cost": 1.50,
        "slotting_cost": 0.0,
        "bundling_cost": 0.0,
        "diecutting_cost": 0.0,
        "profit_margin_percent": 15.0,
        "tax_type": "Non-VAT, Inhouse",
        "distance_km": 30
    }
    calc_data = json.dumps(calc_payload).encode('utf-8')
    req_calc = urllib.request.Request(
        "http://localhost:5000/api/quotes/calculate",
        data=calc_data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    )
    try:
        with urllib.request.urlopen(req_calc) as res:
            calc_results = json.loads(res.read().decode('utf-8'))
            print("[OK] Successfully calculated costing.")
            print(f"  Final Cost per Carton: Rs. {calc_results['final']['final_cost_per_carton']}")
            print(f"  Total Cost (Batch): Rs. {calc_results['final']['total_cost_batch']}")
            print(f"  Overhead per Carton: Rs. {calc_results['per_carton_costs']['overhead']}")
    except urllib.error.HTTPError as e:
        print("[ERROR] Calculation failed. HTTP code:", e.code)
        try:
            print("Response:", e.read().decode('utf-8'))
        except Exception as read_err:
            print("Error reading response:", read_err)
        return
    except Exception as e:
        print("[ERROR] Calculation failed:", e)
        return

    # 3. Save Quote
    save_payload = {
        "customerName": "Test Customer",
        "cartonLength": 300,
        "cartonWidth": 200,
        "cartonHeight": 150,
        "quantity": 1000,
        "plyType": "3-Ply",
        "boardType": "Whitecut",
        "fluteType": "B-Flute",
        "joiningType": "Glued",
        "isPrinted": True,
        "whiteLinerRate": 14.0,
        "brownLinerRate": 12.0,
        "gsm_values": [140, 112, 140],
        "totalOverheadForOrder": 500.0,
        "joiningCost": 2.00,
        "printCost": 1.50,
        "slottingCost": 0.0,
        "bundlingCost": 0.0,
        "diecuttingCost": 0.0,
        "profitMargin": 15.0,
        "taxType": "Non-VAT, Inhouse",
        "deliveryRequired": True,
        "deliveryLocation": "Colombo",
        "distanceKm": 30,
        "calculated_cost": calc_results
    }
    save_data = json.dumps(save_payload).encode('utf-8')
    req_save = urllib.request.Request(
        "http://localhost:5000/api/quotes/save",
        data=save_data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    )
    try:
        with urllib.request.urlopen(req_save) as res:
            save_results = json.loads(res.read().decode('utf-8'))
            quote_id = save_results["id"]
            print(f"[OK] Successfully saved quote. ID: {quote_id}")
    except urllib.error.HTTPError as e:
        print("[ERROR] Save quote failed. HTTP code:", e.code)
        try:
            print("Response:", e.read().decode('utf-8'))
        except:
            pass
        return
    except Exception as e:
        print("[ERROR] Save quote failed:", e)
        return

    # 4. Get History
    req_history = urllib.request.Request(
        "http://localhost:5000/api/quotes/history",
        headers={"Authorization": f"Bearer {token}"}
    )
    try:
        with urllib.request.urlopen(req_history) as res:
            history = json.loads(res.read().decode('utf-8'))
            print(f"[OK] Successfully retrieved quote history. Total quotes: {len(history)}")
            for q in history:
                print(f"  - Quote ID {q['id']} for {q['customer_name']} (Total: Rs. {q['total_cost_batch']})")
    except urllib.error.HTTPError as e:
        print("[ERROR] Fetching history failed. HTTP code:", e.code)
        try:
            print("Response:", e.read().decode('utf-8'))
        except:
            pass
        return
    except Exception as e:
        print("[ERROR] Fetching history failed:", e)
        return

    print("ALL API TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_flow()
