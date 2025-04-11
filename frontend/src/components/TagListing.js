import React, { useState, useEffect } from 'react';

const TagListing = ({objectList}) => {

    const [tagSearch, setTagSearch] = useState('');

    return (

        <div className="max-w-[80%] mx-auto rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Tags Page</h2>
            <input
                type="text"
                placeholder="Search tags..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="w-full mb-4 px-3 py-2 border rounded-md"
            />
            <ul className="list-disc pl-6">
                {objectList
                    .filter(obj => obj.toLowerCase().includes(tagSearch.toLowerCase()))
                    .map((obj) => (
                        <li key={obj.id}>{obj}</li>
                    ))}
            </ul>
        </div>

    );
};

export default TagListing;