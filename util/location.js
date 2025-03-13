async function getCoordinates(address) {
    const baseUrl = "https://nominatim.openstreetmap.org/search";
    const url = `${baseUrl}?format=json&q=${encodeURIComponent(address)}&limit=1`;

    try 
    {
        const response = await globalThis.fetch(url, { 
            headers: { 'User-Agent': 'Mozilla/5.0' } // makes the request look like it's coming from a web browser instead of a script, preventing blocks
        });
        
        //The response variable now holds the raw HTTP response.
        if (!response.ok) 
        {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();

        //Converts the API response to a JavaScript object
        /*[
            {
                "lat": "9.9195",
                "lon": "78.1192",
                "display_name": "NH-7, Kanyakumari National Highway, Madurai, Tamil Nadu, India"
            }
            ]
         */
        if (!data || data.length === 0) 
        {
            throw new Error('No location found for the given address.');
        }

        return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
        };
    } 
    catch (error) 
    {
        console.error('Error fetching coordinates:', error.message);
        return null;
    }
}

module.exports = getCoordinates;
