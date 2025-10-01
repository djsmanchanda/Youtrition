import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // F1 Driver Championship Standings CSV data
    const csvData = `Driver Number,Driver Name,Australia,China,Japan,Bahrain,Saudi Arabia,United States,Italy,Monaco,Spain,Canada,Austria,United Kingdom,Belgium,Hungary,Netherlands,Italy,Azerbaijan,Final Points
1,Max Verstappen,32,44,69,77,95,107,132,144,145,163,163,173,185,187,205,230,255,255
4,Lando Norris,40,58,76,91,103,121,139,164,182,182,207,232,250,275,275,293,299,299
5,Gabriel Bortoleto,0,0,0,0,0,0,0,0,0,0,4,4,6,14,14,18,18,18
6,Isack Hadjar,1,1,5,5,6,6,8,16,22,22,22,22,22,22,37,38,39,39
7,Jack Doohan,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
10,Pierre Gasly,1,1,1,7,7,7,7,7,11,11,11,19,20,20,20,20,20,20
12,Andrea Kimi Antonelli,16,24,32,32,40,48,48,48,48,63,63,63,63,64,64,66,78,78
14,Fernando Alonso,0,0,0,0,0,0,0,0,2,8,14,16,16,26,30,30,30,30
16,Charles Leclerc,13,13,25,37,52,58,66,84,99,109,124,124,139,151,151,163,165,165
18,Lance Stroll,12,14,14,14,14,14,14,14,14,14,14,20,20,26,32,32,32,32
22,Yuki Tsunoda,6,6,6,8,8,9,10,10,10,10,10,10,10,10,12,12,20,20
23,Alexander Albon,10,16,18,18,20,30,40,42,42,42,42,46,54,54,64,70,70,70
27,Nico Hülkenberg,6,6,6,6,6,6,6,6,16,20,22,37,37,37,37,37,37,37
30,Liam Lawson,0,0,0,0,0,0,0,4,4,4,12,12,16,20,20,20,30,30
31,Esteban Ocon,4,14,14,18,18,18,18,24,24,26,27,27,27,27,28,28,28,28
43,Franco Colapinto,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
44,Lewis Hamilton,15,15,21,31,37,41,53,63,71,79,91,103,109,109,109,117,121,121
55,Carlos Sainz,3,4,4,4,8,10,14,15,15,16,16,16,16,16,16,16,31,31
63,George Russell,25,40,50,68,78,93,99,99,111,136,146,147,157,172,184,194,212,212
81,Oscar Piastri,23,48,63,88,113,138,153,168,193,205,223,241,266,284,309,324,324,324
87,Oliver Bearman,2,6,7,8,8,8,8,8,8,8,8,8,8,8,16,16,16,16`;

    // Get format parameter from query string
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'csv';

    if (format === 'json') {
      // Parse CSV and return as JSON
      const lines = csvData.split('\n');
      const headers = lines[0].split(',');
      const drivers = lines.slice(1).map(line => {
        const values = line.split(',');
        const driver: any = {};
        headers.forEach((header, index) => {
          if (header === 'Driver Number') {
            driver.driverNumber = parseInt(values[index]);
          } else if (header === 'Driver Name') {
            driver.driverName = values[index];
          } else if (header === 'Final Points') {
            driver.finalPoints = parseInt(values[index]);
          } else {
            // Race results
            if (!driver.races) driver.races = {};
            driver.races[header] = parseInt(values[index]);
          }
        });
        return driver;
      });

      return NextResponse.json({
        success: true,
        data: drivers,
        totalDrivers: drivers.length
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
    } else {
      // Return as CSV
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="f1-standings.csv"',
        },
      });
    }
  } catch (error) {
    console.error('Error in F1 standings API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch F1 standings data' 
      },
      { status: 500 }
    );
  }
}